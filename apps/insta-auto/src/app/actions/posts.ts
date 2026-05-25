'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { publishPostNow } from '@/lib/publish';

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
    if (!imageUrl) return { ok: false as const, error: '이미지 URL 이 필요합니다 (public URL)' };

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

export async function publishPostAction(postId: string) {
    const userId = await requireUserId();
    const outcome = await publishPostNow(userId, postId);
    revalidatePath('/dashboard');
    return outcome;
}
