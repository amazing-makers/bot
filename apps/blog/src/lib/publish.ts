/**
 * 게시글 발행 오케스트레이션 — 즉시 발행.
 * post → 자격증명 복호화 → WordPress REST 발행 → 성공 시 1 credit 차감 + 상태 갱신.
 * 크레딧은 발행 성공 시에만 차감.
 */

import { prisma } from './prisma';
import { getWordPressCredentials } from './blog-account';
import { publishToWordPress } from './publishers/wordpress';
import { spendCredits, CREDIT_RATES } from './credit';

export interface PublishOutcome {
    ok: boolean;
    remotePostId?: string;
    link?: string;
    error?: string;
}

/** 단일 게시글 즉시 발행. 소유자 확인 포함. */
export async function publishPostNow(userId: string, postId: string): Promise<PublishOutcome> {
    const post = await prisma.blogPost.findFirst({
        where: { id: postId, userId },
        include: { account: { select: { provider: true } } },
    });
    if (!post) return { ok: false, error: '게시글을 찾을 수 없습니다' };
    if (post.status === 'PUBLISHED') return { ok: false, error: '이미 발행된 게시글입니다' };
    if (post.account.provider !== 'WORDPRESS') {
        return { ok: false, error: '현재는 WordPress 발행만 지원합니다 (네이버블로그는 준비 중)' };
    }

    const creds = await getWordPressCredentials(userId, post.accountId);
    if (!creds) {
        await prisma.blogAccount.update({
            where: { id: post.accountId },
            data: { status: 'PENDING_AUTH' },
        }).catch(() => {});
        return { ok: false, error: '계정 자격증명이 유효하지 않습니다 — 재연결이 필요합니다' };
    }

    await prisma.blogPost.update({
        where: { id: post.id },
        data: { status: 'PUBLISHING', error: null },
    });

    try {
        const result = await publishToWordPress({
            credentials: creds,
            title: post.title,
            content: post.content,
            photoUrl: post.photoUrl ?? undefined,
            status: 'publish',
        });

        const spend = await spendCredits(userId, {
            amount: CREDIT_RATES.PUBLISH,
            bot: 'blogbot',
            action: 'PUBLISH',
            refType: 'BlogPost',
            refId: post.id,
        });

        await prisma.blogPost.update({
            where: { id: post.id },
            data: {
                status: 'PUBLISHED',
                publishedAt: new Date(),
                remotePostId: String(result.postId),
                link: result.link,
                creditsUsed: spend.ok ? CREDIT_RATES.PUBLISH : 0,
                error: null,
            },
        });

        return { ok: true, remotePostId: String(result.postId), link: result.link };
    } catch (e: any) {
        const message = e?.message || '발행 중 알 수 없는 오류';
        await prisma.blogPost.update({
            where: { id: post.id },
            data: { status: 'FAILED', error: message },
        });
        return { ok: false, error: message };
    }
}
