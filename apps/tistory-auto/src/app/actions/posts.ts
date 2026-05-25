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

export interface CreatePostInput {
    accountId: string;
    title: string;
    content: string;
    photoUrl?: string;
    publishNow?: boolean;
    scheduledAt?: string;
}

export async function createPostAction(input: CreatePostInput) {
    const userId = await requireUserId();

    const title = (input.title || '').trim();
    const content = (input.content || '').trim();
    if (!title) return { ok: false as const, error: '제목을 입력하세요' };
    if (!content) return { ok: false as const, error: '본문을 입력하세요' };

    const account = await prisma.tistoryAccount.findFirst({
        where: { id: input.accountId, userId },
        select: { id: true },
    });
    if (!account) return { ok: false as const, error: '블로그를 찾을 수 없습니다' };

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

    const post = await prisma.tistoryPost.create({
        data: {
            userId,
            accountId: account.id,
            title,
            content,
            photoUrl: (input.photoUrl || '').trim() || null,
            status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
            scheduledAt,
        },
    });

    revalidatePath('/dashboard');

    // 티스토리 자동 발행은 Phase 2(에이전트) — publishNow 여도 초안 저장 후 안내만.
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
