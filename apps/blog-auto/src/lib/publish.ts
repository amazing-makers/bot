/**
 * 발행 오케스트레이션 — WordPress 즉시 발행 + 예약 자동발행(디스패치).
 *
 * 신뢰성:
 *   - 멱등: PUBLISHED/PUBLISHING 가드 + 원자적 claim 으로 중복 발행 방지.
 *     (WordPress POST /posts 는 비멱등이라 자동 재시도는 하지 않음 — 중복 글 생성 방지.
 *      일시 실패는 FAILED 로 두고 사용자가 '재발행'.)
 *   - 인증 오류(401/403) → 계정 PENDING_AUTH 전환.
 *   - 가시성: attemptCount / lastAttemptAt / error.
 *   - 발행은 무료 (AI 만 사용자 BYOK 키).
 *   - 본문은 마크다운으로 저장 → 발행 시 HTML 로 변환해 WordPress 전송.
 */

import { marked } from 'marked';
import { prisma } from './prisma';
import { getWordPressCredentials } from './blog-account';
import { publishToWordPress, type WordPressCredentials } from './publishers/wordpress';

/** 본문(마크다운)을 WordPress 용 HTML 로 변환. */
function toHtml(markdown: string): string {
    return marked.parse(markdown, { async: false }) as string;
}

export interface PublishOutcome {
    ok: boolean;
    remotePostId?: string;
    link?: string;
    error?: string;
}

function isAuthError(message: string): boolean {
    return /\b(401|403)\b/.test(message) || /rest_cannot|unauthorized|forbidden|incorrect_password/i.test(message);
}

type PostRow = {
    id: string; userId: string; accountId: string;
    title: string; content: string; photoUrl: string | null;
};

const POST_SELECT = { id: true, userId: true, accountId: true, title: true, content: true, photoUrl: true } as const;

/** PUBLISHING 으로 claim 된 글을 실제 발행. */
async function executePublish(post: PostRow, creds: WordPressCredentials): Promise<PublishOutcome> {
    await prisma.blogPost.update({
        where: { id: post.id },
        data: { attemptCount: { increment: 1 }, lastAttemptAt: new Date(), error: null },
    });

    try {
        const result = await publishToWordPress({
            credentials: creds,
            title: post.title,
            content: toHtml(post.content), // 마크다운 → HTML
            photoUrl: post.photoUrl ?? undefined,
            status: 'publish',
        });

        // 발행은 무료 — 크레딧 차감 없음.
        await prisma.blogPost.update({
            where: { id: post.id },
            data: {
                status: 'PUBLISHED',
                publishedAt: new Date(),
                remotePostId: String(result.postId),
                link: result.link,
                error: null,
            },
        });
        return { ok: true, remotePostId: String(result.postId), link: result.link };
    } catch (e: any) {
        const message = e?.message || '발행 중 알 수 없는 오류';
        await prisma.blogPost.update({ where: { id: post.id }, data: { status: 'FAILED', error: message } });
        if (isAuthError(message)) {
            await prisma.blogAccount.update({ where: { id: post.accountId }, data: { status: 'PENDING_AUTH' } }).catch(() => {});
        }
        return { ok: false, error: message };
    }
}

/** 단일 글 발행(즉시/재발행). 소유자 확인 + 멱등. */
export async function publishPostNow(userId: string, postId: string): Promise<PublishOutcome> {
    const post = await prisma.blogPost.findFirst({
        where: { id: postId, userId },
        include: { account: { select: { provider: true } } },
    });
    if (!post) return { ok: false, error: '글을 찾을 수 없습니다' };
    if (post.status === 'PUBLISHED') return { ok: false, error: '이미 발행된 글입니다' };
    if (post.status === 'PUBLISHING') return { ok: false, error: '이미 발행이 진행 중입니다' };
    if (post.account.provider !== 'WORDPRESS') {
        return { ok: false, error: '현재는 WordPress 발행만 지원합니다 (네이버블로그는 에이전트 준비 중)' };
    }

    const creds = await getWordPressCredentials(userId, post.accountId);
    if (!creds) {
        await prisma.blogAccount.update({ where: { id: post.accountId }, data: { status: 'PENDING_AUTH' } }).catch(() => {});
        return { ok: false, error: '계정 자격증명이 유효하지 않습니다 — 재연결이 필요합니다' };
    }

    const claim = await prisma.blogPost.updateMany({
        where: { id: post.id, status: { in: ['DRAFT', 'SCHEDULED', 'FAILED'] } },
        data: { status: 'PUBLISHING' },
    });
    if (claim.count !== 1) return { ok: false, error: '발행 상태가 변경되어 진행할 수 없습니다 (새로고침)' };

    return executePublish(post as PostRow, creds);
}

export interface DispatchSummary { processed: number; succeeded: number; failed: number; skipped: number }

/** 예약 자동발행 — scheduledAt <= now 인 SCHEDULED 글 발행 (cron). */
export async function dispatchDueScheduled(limit = 20): Promise<DispatchSummary> {
    const now = new Date();
    const due = await prisma.blogPost.findMany({
        // 워드프레스(API)만 cron 발행. 네이버(NAVER)는 데스크톱 에이전트가 폴링·발행.
        where: { status: 'SCHEDULED', scheduledAt: { lte: now }, account: { provider: 'WORDPRESS' } },
        orderBy: { scheduledAt: 'asc' },
        take: limit,
        select: { id: true },
    });

    const summary: DispatchSummary = { processed: 0, succeeded: 0, failed: 0, skipped: 0 };

    for (const { id } of due) {
        const claim = await prisma.blogPost.updateMany({ where: { id, status: 'SCHEDULED' }, data: { status: 'PUBLISHING' } });
        if (claim.count !== 1) { summary.skipped++; continue; }

        const post = await prisma.blogPost.findUnique({ where: { id }, select: POST_SELECT });
        if (!post) { summary.skipped++; continue; }
        summary.processed++;

        const creds = await getWordPressCredentials(post.userId, post.accountId);
        if (!creds) {
            await prisma.blogPost.update({ where: { id }, data: { status: 'FAILED', error: '계정 자격증명 무효 — 재연결 필요' } });
            await prisma.blogAccount.update({ where: { id: post.accountId }, data: { status: 'PENDING_AUTH' } }).catch(() => {});
            summary.failed++;
            continue;
        }

        const outcome = await executePublish(post as PostRow, creds);
        if (outcome.ok) summary.succeeded++; else summary.failed++;
    }

    return summary;
}
