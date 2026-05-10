/**
 * Replicate client wrapper.
 *
 * 주 사용:
 *   - FLUX 1.1 Pro Fill (인페인팅) — 마스크 영역의 원본 글자 자연스럽게 제거.
 *   - FLUX 1.1 Pro (신규 이미지 생성, Phase 3).
 *
 * Replicate 는 model:version 형식. version pin 은 안정성 ↑ 비용 같음.
 */

import Replicate from 'replicate';

let client: Replicate | null = null;

export function getReplicate(): Replicate {
    if (client) return client;
    const auth = process.env.REPLICATE_API_TOKEN;
    if (!auth) throw new Error('REPLICATE_API_TOKEN 환경변수가 없습니다');
    client = new Replicate({ auth });
    return client;
}

// 모델 ID — Replicate 의 최신 모델. version 은 Replicate 페이지에서 확인.
// FLUX 1.1 Pro Fill (인페인팅 specialized).
export const FLUX_FILL_MODEL = 'black-forest-labs/flux-fill-pro' as const;
// FLUX 1.1 Pro (text-to-image, Phase 3).
export const FLUX_PRO_MODEL = 'black-forest-labs/flux-1.1-pro' as const;
