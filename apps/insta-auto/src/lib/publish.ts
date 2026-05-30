/**
 * 발행 오케스트레이션 — 즉시 발행 + 예약 자동발행(디스패치).
 *
 * 신뢰성:
 *   - 멱등: PUBLISHED/PUBLISHING 가드 + 원자적 claim 으로 중복 발행 방지.
 *   - 재시도: publisher 단계별 transient 재시도 (publishers/instagram).
 *   - 토큰만료: isAuthError → 계정 PENDING_AUTH 전환 + 명확한 안내 (재연결 유도).
 *   - 가시성: attemptCount / lastAttemptAt / error 기록.
 *   - 크레딧: 발행 성공 시에만 차감.
 */

import { prisma } from './prisma';
import { getAccountCredentials } from './instagram-account';
import { publishToInstagram, isAuthError, type InstagramCredentials } from './publishers/instagram';
import { spendCredits, CREDIT_RATES } from './credit';

export interface PublishOutcome {
    ok: boolean;
    mediaId?: string;
    permalink?: string;
    error?: string;
}

/** IG Graph API 는 public https 이미지 URL 만 fetch 가능 — 사전 검증. */
export function validateImageUrl(url: string | null | undefined): string | null {
    if (!url) return '이미지 URL 이 필요합니다';
    let u: URL;
    try {
        u = new URL(url);
    } catch {
        return '이미지 URL 형식이 올바르지 않습니다';
    }
    if (u.protocol !== 'https:') return '이미지는 공개 https URL 이어야 합니다 (인스타 서버가 직접 가져갑니다)';
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host.startsWith('127.') || host.endsWith('.local') || host === '0.0.0.0') {
        return '로컬/내부 주소는 인스타가 가져갈 수 없습니다 — 공개 호스팅 URL(R2/CDN 등)을 쓰세요';
    }
    return null;
}

type PostRow = {
    id: string;
    userId: string;
    accountId: string;
    caption: string;
    imageUrl: string | null;
    videoUrl: string | null;
    mediaType: string;
    attemptCount: number;
};

/** 이미 PUBLISHING 으로 claim 된 글을 실제 발행 (성공/실패 상태 기록). */
async function executePublish(post: PostRow, creds: InstagramCredentials): Promise<PublishOutcome> {
    await prisma.instagramPost.update({
        where: { id: post.id },
        data: { attemptCount: { increment: 1 }, lastAttemptAt: new Date(), error: null },
    });

    try {
        const result = await publishToInstagram({
            credentials: creds,
            caption: post.caption,
            imageUrl: post.imageUrl ?? undefined,
            videoUrl: post.videoUrl ?? undefined,
            mediaType: post.mediaType === 'REELS' ? 'REELS' : 'IMAGE',
        });

        const spend = await spendCredits(post.userId, {
            amount: CREDIT_RATES.PUBLISH,
            bot: 'instaauto',
            action: 'PUBLISH',
            refType: 'InstagramPost',
            refId: post.id,
            idempotent: true, // 같은 글 재발행/재시도 시 이중 차감 방지
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
        const authErr = isAuthError(e);
        const message = authErr
            ? '계정 토큰이 만료/무효합니다 — 계정 재연결이 필요합니다'
            : (e?.message || '발행 중 알 수 없는 오류');

        await prisma.instagramPost.update({
            where: { id: post.id },
            data: { status: 'FAILED', error: message },
        });
        if (authErr) {
            await prisma.instagramAccount.update({
                where: { id: post.accountId },
                data: { status: 'PENDING_AUTH' },
            }).catch(() => {});
        }
        return { ok: false, error: message };
    }
}

const POST_SELECT = {
    id: true, userId: true, accountId: true, caption: true,
    imageUrl: true, videoUrl: true, mediaType: true, attemptCount: true,
} as const;

/** 단일 게시물 발행 (즉시/재발행). 소유자 확인 + 멱등 + 이미지 검증. */
export async function publishPostNow(userId: string, postId: string): Promise<PublishOutcome> {
    const post = await prisma.instagramPost.findFirst({ where: { id: postId, userId } });
    if (!post) return { ok: false, error: '게시물을 찾을 수 없습니다' };
    if (post.status === 'PUBLISHED') return { ok: false, error: '이미 발행된 게시물입니다' };
    if (post.status === 'PUBLISHING') return { ok: false, error: '이미 발행이 진행 중입니다' };

    if (!post.videoUrl) {
        const imgErr = validateImageUrl(post.imageUrl);
        if (imgErr) return { ok: false, error: imgErr };
    }

    const creds = await getAccountCredentials(userId, post.accountId);
    if (!creds) {
        await prisma.instagramAccount.update({
            where: { id: post.accountId }, data: { status: 'PENDING_AUTH' },
        }).catch(() => {});
        return { ok: false, error: '계정 토큰이 유효하지 않습니다 — 재연결이 필요합니다' };
    }

    // 원자적 claim: 현재 상태(DRAFT/SCHEDULED/FAILED)에서만 PUBLISHING 으로 전환.
    const claim = await prisma.instagramPost.updateMany({
        where: { id: post.id, status: { in: ['DRAFT', 'SCHEDULED', 'FAILED'] } },
        data: { status: 'PUBLISHING' },
    });
    if (claim.count !== 1) return { ok: false, error: '발행 상태가 변경되어 진행할 수 없습니다 (새로고침)' };

    return executePublish({ ...post, mediaType: String(post.mediaType) } as PostRow, creds);
}

export interface DispatchSummary {
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
}

/**
 * 예약 자동발행 — scheduledAt <= now 인 SCHEDULED 글을 발행 (cron 에서 호출).
 * 글마다 원자적 claim(SCHEDULED→PUBLISHING) 후 발행 → 중복 디스패치에도 안전.
 */
export async function dispatchDueScheduled(limit = 20): Promise<DispatchSummary> {
    const now = new Date();
    const due = await prisma.instagramPost.findMany({
        where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
        orderBy: { scheduledAt: 'asc' },
        take: limit,
        select: { id: true },
    });

    const summary: DispatchSummary = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

    for (const { id } of due) {
        // 이 러너가 claim 한 경우에만 처리 (동시 cron 중복 방지).
        const claim = await prisma.instagramPost.updateMany({
            where: { id, status: 'SCHEDULED' },
            data: { status: 'PUBLISHING' },
        });
        if (claim.count !== 1) { summary.skipped++; continue; }

        const post = await prisma.instagramPost.findUnique({ where: { id }, select: POST_SELECT });
        if (!post) { summary.skipped++; continue; }
        summary.processed++;

        // 이미지 검증 (video 가 아니면)
        if (!post.videoUrl) {
            const imgErr = validateImageUrl(post.imageUrl);
            if (imgErr) {
                await prisma.instagramPost.update({ where: { id }, data: { status: 'FAILED', error: imgErr } });
                summary.failed++;
                continue;
            }
        }

        const creds = await getAccountCredentials(post.userId, post.accountId);
        if (!creds) {
            await prisma.instagramPost.update({ where: { id }, data: { status: 'FAILED', error: '계정 토큰 무효 — 재연결 필요' } });
            await prisma.instagramAccount.update({ where: { id: post.accountId }, data: { status: 'PENDING_AUTH' } }).catch(() => {});
            summary.failed++;
            continue;
        }

        const outcome = await executePublish({ ...post, mediaType: String(post.mediaType) } as PostRow, creds);
        if (outcome.ok) summary.succeeded++; else summary.failed++;
    }

    return summary;
}
