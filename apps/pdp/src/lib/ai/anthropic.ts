/**
 * Anthropic Claude client wrapper.
 *
 * 주 사용 — 번역 (Claude Opus 4.7), 카피라이팅 (Phase 2-3), 상품 분석.
 *
 * BYOK 지원: getAnthropic(userKey) 로 사용자 키 명시 시 → 새 client (캐시 X). 없으면 운영자 키 (캐시 O).
 */

import Anthropic from '@anthropic-ai/sdk';

let operatorClient: Anthropic | null = null;

/**
 * @param userKey BYOK 모드 — 사용자가 입력한 Anthropic 키. 넘기면 운영자 키 대신 사용.
 */
export function getAnthropic(userKey?: string | null): Anthropic {
    if (userKey) {
        return new Anthropic({ apiKey: userKey });
    }
    if (operatorClient) return operatorClient;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 없습니다');
    operatorClient = new Anthropic({ apiKey });
    return operatorClient;
}

// 모델 ID 는 Anthropic 의 최신 안정 버전. 새 모델 출시 시 한 곳만 변경.
export const CLAUDE_OPUS = 'claude-opus-4-7';
export const CLAUDE_SONNET = 'claude-sonnet-4-6';
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';

/** 번역·카피·분석 — 품질 우선이면 Opus. 빠르고 싸게는 Haiku. */
export const DEFAULT_TRANSLATE_MODEL = CLAUDE_OPUS;
