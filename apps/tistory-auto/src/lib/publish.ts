/**
 * 발행 오케스트레이션 — 티스토리는 데스크톱 에이전트가 실제 발행.
 *
 * 흐름: 발행 누름 → 글을 QUEUED 로 적재 → 에이전트가 /api/agent/poll 로 가져가 발행 →
 *       /api/agent/complete 로 결과 보고(PUBLISHED/FAILED).
 */

import { prisma } from './prisma';

export interface PublishOutcome {
    ok: boolean;
    queued?: boolean;
    error?: string;
}

/** 발행 요청 = 에이전트 큐에 적재(QUEUED). 실제 발행은 에이전트가 처리. */
export async function publishPostNow(userId: string, postId: string): Promise<PublishOutcome> {
    const post = await prisma.tistoryPost.findFirst({ where: { id: postId, userId } });
    if (!post) return { ok: false, error: '글을 찾을 수 없습니다' };
    if (post.status === 'PUBLISHED') return { ok: false, error: '이미 발행된 글입니다' };

    await prisma.tistoryPost.update({
        where: { id: post.id },
        data: { status: 'QUEUED', error: null },
    });

    return {
        ok: true,
        queued: true,
        error: undefined,
    };
}

export interface DispatchSummary { queued: number }

/** 예약 도래(SCHEDULED + scheduledAt<=now)한 글을 QUEUED 로 전환 → 에이전트가 발행. (cron) */
export async function dispatchDueScheduled(limit = 50): Promise<DispatchSummary> {
    const now = new Date();
    const due = await prisma.tistoryPost.findMany({
        where: { status: 'SCHEDULED', scheduledAt: { lte: now } },
        orderBy: { scheduledAt: 'asc' },
        take: limit,
        select: { id: true },
    });
    if (due.length === 0) return { queued: 0 };
    const res = await prisma.tistoryPost.updateMany({
        where: { id: { in: due.map((p) => p.id) }, status: 'SCHEDULED' },
        data: { status: 'QUEUED', error: null },
    });
    return { queued: res.count };
}
