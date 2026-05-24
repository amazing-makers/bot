/**
 * 게시물 발행 오케스트레이션 — 즉시 발행 흐름.
 *
 * post → 자격증명 복호화 → Graph API 2-step 발행 → 성공 시 1 credit 차감 + 상태 갱신.
 * 크레딧은 발행 성공 시에만 차감 (실패 무료).
 */

import { prisma } from './prisma';
import { getAccountCredentials } from './instagram-account';
import { publishToInstagram } from './publishers/instagram';
import { spendCredits, CREDIT_RATES } from './credit';

export interface PublishOutcome {
    ok: boolean;
    mediaId?: string;
    permalink?: string;
    error?: string;
}

/** 단일 게시물 즉시 발행. 소유자 확인 포함. */
export async function publishPostNow(userId: string, postId: string): Promise<PublishOutcome> {
    const post = await prisma.instagramPost.findFirst({
        where: { id: postId, userId },
    });
    if (!post) return { ok: false, error: '게시물을 찾을 수 없습니다' };
    if (post.status === 'PUBLISHED') return { ok: false, error: '이미 발행된 게시물입니다' };

    const creds = await getAccountCredentials(userId, post.accountId);
    if (!creds) {
        await prisma.instagramAccount.update({
            where: { id: post.accountId },
            data: { status: 'PENDING_AUTH' },
        }).catch(() => {});
        return { ok: false, error: '계정 토큰이 유효하지 않습니다 — 재연결이 필요합니다' };
    }

    await prisma.instagramPost.update({
        where: { id: post.id },
        data: { status: 'PUBLISHING', error: null },
    });

    try {
        const result = await publishToInstagram({
            credentials: creds,
            caption: post.caption,
            imageUrl: post.imageUrl ?? undefined,
            videoUrl: post.videoUrl ?? undefined,
            mediaType: post.mediaType === 'REELS' ? 'REELS' : 'IMAGE',
        });

        const spend = await spendCredits(userId, {
            amount: CREDIT_RATES.PUBLISH,
            bot: 'instabot',
            action: 'PUBLISH',
            refType: 'InstagramPost',
            refId: post.id,
        });

        await prisma.instagramPost.update({
            where: { id: post.id },
            data: {
                status: 'PUBLISHED',
                publishedAt: new Date(),
                mediaId: result.mediaId,
                permalink: result.permalink,
                creditsUsed: spend.ok ? CREDIT_RATES.PUBLISH : 0,
                error: null,
            },
        });

        return { ok: true, mediaId: result.mediaId, permalink: result.permalink };
    } catch (e: any) {
        const message = e?.message || '발행 중 알 수 없는 오류';
        await prisma.instagramPost.update({
            where: { id: post.id },
            data: { status: 'FAILED', error: message },
        });
        return { ok: false, error: message };
    }
}
