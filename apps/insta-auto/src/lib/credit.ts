/**
 * Credit billing — 공유 @amakers/billing 재export (insta-auto 어댑터).
 *
 * 통합 크레딧 지갑은 packages/billing 으로 통합됨. 여기선 insta-auto 가 쓰던
 * 평탄한 CREDIT_RATES(= 봇 'instaauto' 단가)만 어댑터로 제공해 기존 호출부 호환 유지.
 */

import { CREDIT_RATES as RATES } from '@amakers/billing';

export { spendCredits, addCredits, getBalance } from '@amakers/billing';

/** insta-auto 단가 (PUBLISH/AI_CAPTION/AI_IMAGE) — 기존 호출부 호환용 평탄 형태(구체 number). */
export const CREDIT_RATES = {
    PUBLISH: RATES.instaauto.PUBLISH ?? 1,
    AI_CAPTION: RATES.instaauto.AI_CAPTION ?? 3,
    AI_IMAGE: RATES.instaauto.AI_IMAGE ?? 20,
} as const;
