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

    // 티스토리 발행은 에이전트 큐(QUEUED). publishNow 면 큐 적재.
    if (input.publishNow && !scheduledAt) {
        const outcome = await publishPostNow(userId, post.id);
        revalidatePath('/dashboard');
        return { ...outcome, postId: post.id };
    }

    return { ok: true as const, postId: post.id };
}

export interface CreatePostsInput {
    accountIds: string[];
    title: string;
    content: string;
    photoUrl?: string;
    publishNow?: boolean;
    scheduledAt?: string;
}

/** 여러 티스토리 블로그에 동시 작성/발행(큐 적재) — 선택한 블로그마다 글 1개씩. */
export async function createPostsAction(input: CreatePostsInput) {
    const userId = await requireUserId();

    const title = (input.title || '').trim();
    const content = (input.content || '').trim();
    if (!title) return { ok: false as const, error: '제목을 입력하세요' };
    if (!content) return { ok: false as const, error: '본문을 입력하세요' };

    const ids = [...new Set((input.accountIds || []).filter(Boolean))];
    if (ids.length === 0) return { ok: false as const, error: '블로그를 1개 이상 선택하세요' };

    const accounts = await prisma.tistoryAccount.findMany({ where: { id: { in: ids }, userId }, select: { id: true } });
    if (accounts.length === 0) return { ok: false as const, error: '선택한 블로그를 찾을 수 없습니다' };

    const photoUrl = (input.photoUrl || '').trim() || null;
    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    let created = 0, published = 0, failed = 0;
    const errors: string[] = [];

    for (const acc of accounts) {
        const post = await prisma.tistoryPost.create({
            data: { userId, accountId: acc.id, title, content, photoUrl, status: scheduledAt ? 'SCHEDULED' : 'DRAFT', scheduledAt },
        });
        created++;
        if (input.publishNow && !scheduledAt) {
            const outcome = await publishPostNow(userId, post.id);
            if (outcome.ok) published++;
            else { failed++; if (outcome.error) errors.push(outcome.error); }
        }
    }

    revalidatePath('/dashboard');
    return { ok: true as const, accounts: accounts.length, created, published, failed, errors };
}

export interface UpdatePostInput {
    postId: string;
    title: string;
    content: string;
    photoUrl?: string;
    scheduledAt?: string;
    publishNow?: boolean;
}

/** DRAFT/SCHEDULED 글만 수정 가능. 소유 검증. */
export async function updatePostAction(input: UpdatePostInput) {
    const userId = await requireUserId();

    const title = (input.title || '').trim();
    const content = (input.content || '').trim();
    if (!title) return { ok: false as const, error: '제목을 입력하세요' };
    if (!content) return { ok: false as const, error: '본문을 입력하세요' };

    const existing = await prisma.tistoryPost.findFirst({
        where: { id: input.postId, userId },
        select: { id: true, status: true },
    });
    if (!existing) return { ok: false as const, error: '글을 찾을 수 없습니다' };
    if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') {
        return { ok: false as const, error: '발행 대기/발행된 글은 수정할 수 없습니다' };
    }

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;

    await prisma.tistoryPost.update({
        where: { id: existing.id },
        data: {
            title,
            content,
            photoUrl: (input.photoUrl || '').trim() || null,
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
