/**
 * 티스토리 발행 — Phase 2 (데스크톱 에이전트) 예정 스텁.
 *
 * 티스토리는 공개 발행 API 가 사실상 막혀 있어, 인스타/워드프레스처럼 HTTP 로 바로 발행할 수 없다.
 * 실제 발행은 카카오 로그인 기반 브라우저 자동화(Playwright) 데스크톱 에이전트가 담당할 예정.
 * (마케팅봇의 에이전트 task 폴링 패턴 재사용 — /api/agent/poll 류)
 *
 * 지금은 호출 시 "에이전트 미연동" 을 명확히 알리는 스텁.
 */

export interface TistoryPublishInput {
    siteUrl: string;
    title: string;
    content: string;
    photoUrl?: string;
}

export interface TistoryPublishResult {
    remotePostId: string;
    link: string;
}

const NOT_IMPLEMENTED =
    '티스토리 자동 발행은 데스크톱 에이전트 연동(Phase 2)이 필요합니다. ' +
    '현재는 글 작성·예약(초안)까지 지원하며, 발행은 에이전트 출시 후 활성화됩니다.';

/** 발행 (Phase 2 미구현). */
export async function publishToTistory(_input: TistoryPublishInput): Promise<TistoryPublishResult> {
    throw new Error(NOT_IMPLEMENTED);
}

export const TISTORY_AGENT_PENDING_MESSAGE = NOT_IMPLEMENTED;
