/**
 * OpenAI client wrapper.
 *
 * 주 사용 — GPT-4 Vision OCR (이미지 안 텍스트 위치 + 내용 추출).
 * 일반 chat 도 사용 가능 (DALL-E edit 은 Phase 3 신규 디자인용 — 별도 함수).
 */

import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
    if (client) return client;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY 환경변수가 없습니다');
    client = new OpenAI({ apiKey });
    return client;
}

export const OPENAI_VISION_MODEL = 'gpt-4o';
