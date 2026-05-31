'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { publishPostNow, validateImageUrl } from '@/lib/publish';

async function requireUserId(): Promise<string> {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error('로그인이 필요합니다');
    return userId;
}

const IG_CAPTION_LIMIT = 2200;

export interface CreatePostInput {
    accountId: string;
    caption: string;
    imageUrl?: string;
    /** true 면 생성 직후 즉시 발행 */
    publishNow?: boolean;
    /** ISO 문자열 — 있으면 예약 */
    scheduledAt?: string;
}

export async function createPostAction(input: CreatePostInput) {
    const userId = await requireUserId();

    const caption = (input.caption || '').trim();
    if (!caption) return { ok: false as const, error: 'caption 을 입력하세요' };
    if (caption.length > IG_CAPTION_LIMIT) {
        return { ok: false as const, error: `caption 한도 ${IG_CAPTION_LIMIT}자 초과 (현재 ${caption.length}자)` };
    }
    const imageUrl = (input.imageUrl || '').trim() || null;
    const imgErr = validateImageUrl(imageUrl);
    if (imgErr) return { ok: false as const, error: imgErr };

    // 계정 소유 확인
    const account = await prisma.instagramAccount.findFirst({
        where: { id: input.accountId, userId },
        select: { id: true },
    });
    if (!account) return { ok: false as const, error: '계정을 찾을 수 없습니다' };

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

    const post = await prisma.instagramPost.create({
        data: {
            userId,
            accountId: account.id,
            caption,
            imageUrl,
            mediaType: 'IMAGE',
            status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
            scheduledAt,
        },
    });

    revalidatePath('/dashboard');

    if (input.publishNow && !scheduledAt) {
        const outcome = await publishPostNow(userId, post.id);
        revalidatePath('/dashboard');
        return { ...outcome, postId: post.id };
    }

    return { ok: true as const, postId: post.id };
}

export interface UpdatePostInput {
    postId: string;
    caption: string;
    imageUrl?: string;
    /** ISO 문자열 — 있으면 예약(SCHEDULED), 없으면 초안(DRAFT) */
    scheduledAt?: string;
    /** true 면 저장 직후 즉시 발행 */
    publishNow?: boolean;
}

/** DRAFT/SCHEDULED 글만 수정 가능 (발행된 글은 IG에서 수정 불가). 소유 검증. */
export async function updatePostAction(input: UpdatePostInput) {
    const userId = await requireUserId();

    const caption = (input.caption || '').trim();
    if (!caption) return { ok: false as const, error: 'caption 을 입력하세요' };
    if (caption.length > IG_CAPTION_LIMIT) {
        return { ok: false as const, error: `caption 한도 ${IG_CAPTION_LIMIT}자 초과 (현재 ${caption.length}자)` };
    }
    const imageUrl = (input.imageUrl || '').trim() || null;
    const imgErr = validateImageUrl(imageUrl);
    if (imgErr) return { ok: false as const, error: imgErr };

    const existing = await prisma.instagramPost.findFirst({
        where: { id: input.postId, userId },
        select: { id: true, status: true },
    });
    if (!existing) return { ok: false as const, error: '글을 찾을 수 없습니다' };
    if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') {
        return { ok: false as const, error: '발행 중/발행된 글은 수정할 수 없습니다' };
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

    await prisma.instagramPost.update({
        where: { id: existing.id },
        data: {
            caption,
            imageUrl,
            status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
            scheduledAt,
            error: null,
        },
    });

    revalidatePath('/dashboard');

    if (input.publishNow && !scheduledAt) {
        const outcome = await publishPostNow(userId, existing.id);
        revalidatePath('/dashboard');
        return { ...outcome, postId: existing.id };
    }

    return { ok: true as const, postId: existing.id };
}

export async function publishPostAction(postId: string) {
    const userId = await requireUserId();
    const outcome = await publishPostNow(userId, postId);
    revalidatePath('/dashboard');
    return outcome;
}
