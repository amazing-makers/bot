/**
 * OpenAI client wrapper.
 *
 * 주 사용 — GPT-4 Vision OCR (이미지 안 텍스트 위치 + 내용 추출).
 *
 * BYOK 지원: getOpenAI(userKey) 로 사용자 키 명시 시 → 새 client (캐시 X). 없으면 운영자 키 client (캐시 O).
 */

import OpenAI from 'openai';

let operatorClient: OpenAI | null = null;

/**
 * @param userKey BYOK 모드 — 사용자가 입력한 OpenAI 키 (lib/api-keys.ts 의 getUserApiKey 결과).
 *                넘기면 운영자 키 대신 사용 (사용자가 직접 OpenAI 에 결제, credit 차감 X).
 */
export function getOpenAI(userKey?: string | null): OpenAI {
    if (userKey) {
        return new OpenAI({ apiKey: userKey });
    }
    if (operatorClient) return operatorClient;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY 환경변수가 없습니다');
    operatorClient = new OpenAI({ apiKey });
    return operatorClient;
}

export const OPENAI_VISION_MODEL = 'gpt-4o';
