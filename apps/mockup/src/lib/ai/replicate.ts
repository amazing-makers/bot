/**
 * Replicate client wrapper.
 *
 * 주 사용:
 *   - FLUX Kontext Pro (목업 이미지 생성) — 상품 이미지를 목업 컨텍스트에 합성.
 *
 * Replicate 는 model:version 형식. version pin 은 안정성 ↑ 비용 같음.
 */

import Replicate from 'replicate';

let operatorClient: Replicate | null = null;

/**
 * @param userKey BYOK 모드 — 사용자가 입력한 Replicate API token. 넘기면 운영자 키 대신 사용.
 */
export function getReplicate(userKey?: string | null): Replicate {
    if (userKey) {
        return new Replicate({ auth: userKey });
    }
    if (operatorClient) return operatorClient;
    const auth = process.env.REPLICATE_API_TOKEN;
    if (!auth) throw new Error('REPLICATE_API_TOKEN 환경변수가 없습니다');
    operatorClient = new Replicate({ auth });
    return operatorClient;
}

// FLUX Kontext Pro — 이미지 기반 편집/합성 전문.
export const FLUX_KONTEXT_PRO_MODEL = 'black-forest-labs/flux-kontext-pro' as const;
