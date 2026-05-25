/**
 * 발행 오케스트레이션 — 티스토리는 Phase 2(에이전트)라 현재는 발행 불가, 초안/예약 저장만.
 */

import { prisma } from './prisma';
import { TISTORY_AGENT_PENDING_MESSAGE } from './publishers/tistory';

export interface PublishOutcome {
    ok: boolean;
    remotePostId?: string;
    link?: string;
    error?: string;
}

/**
 * 즉시 발행 시도. 현재 티스토리 자동 발행 미지원(에이전트 Phase 2) → 명확히 안내.
 * 글은 보존되며(초안), 에이전트 출시 후 발행 가능.
 */
export async function publishPostNow(userId: string, postId: string): Promise<PublishOutcome> {
    const post = await prisma.tistoryPost.findFirst({ where: { id: postId, userId } });
    if (!post) return { ok: false, error: '글을 찾을 수 없습니다' };

    // 발행 시도 기록만 남기고 DRAFT 유지 (데이터 손실 없음).
    await prisma.tistoryPost.update({
        where: { id: post.id },
        data: { error: TISTORY_AGENT_PENDING_MESSAGE },
    });

    return { ok: false, error: TISTORY_AGENT_PENDING_MESSAGE };
}
