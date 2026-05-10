/**
 * Anthropic Claude client wrapper.
 *
 * 주 사용 — 번역 (Claude Opus 4.7), 카피라이팅 (Phase 2-3), 상품 분석.
 * Vision 도 지원 (대안 OCR) 하지만 OCR 정확도는 GPT-4 Vision 이 약간 더 좋아 OpenAI 우선.
 */

import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
    if (client) return client;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY 환경변수가 없습니다');
    client = new Anthropic({ apiKey });
    return client;
}

// 모델 ID 는 Anthropic 의 최신 안정 버전. 새 모델 출시 시 한 곳만 변경.
export const CLAUDE_OPUS = 'claude-opus-4-7';
export const CLAUDE_SONNET = 'claude-sonnet-4-6';
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';

/** 번역·카피·분석 — 품질 우선이면 Opus. 빠르고 싸게는 Haiku. */
export const DEFAULT_TRANSLATE_MODEL = CLAUDE_OPUS;
