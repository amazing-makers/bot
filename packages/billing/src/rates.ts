/**
 * @amakers/billing — 통합 크레딧 단가표 + 타입.
 *
 * 모든 봇이 하나의 UserCredit.balance 에서 차감. 단가 조정은 여기 한 곳.
 */

export type Bot =
  | 'instaauto'
  | 'naverblogauto'
  | 'tistoryauto'
  | 'marketingbot'
  | 'pdpbot'
  | 'designbot'
  | 'mockupbot'
  | 'adminbot';

export type SpendAction =
  | 'PUBLISH'
  | 'AI_CAPTION'
  | 'AI_IMAGE'
  | 'AI_VIDEO'
  | 'TRANSLATE';

export type LedgerAction = SpendAction | 'PURCHASE' | 'REFUND' | 'SUBSCRIPTION_GRANT';

/** 봇·액션별 크레딧 단가. 없는 조합은 0(과금 안 함). */
export const CREDIT_RATES: Record<Bot, Partial<Record<SpendAction, number>>> = {
  instaauto: { PUBLISH: 1, AI_CAPTION: 3, AI_IMAGE: 20 },
  naverblogauto: { PUBLISH: 1, AI_CAPTION: 3, AI_IMAGE: 20 },
  tistoryauto: { PUBLISH: 1, AI_CAPTION: 3, AI_IMAGE: 20 },
  marketingbot: { PUBLISH: 1, AI_CAPTION: 3, AI_IMAGE: 20, AI_VIDEO: 100, TRANSLATE: 1 },
  pdpbot: { AI_IMAGE: 20 },
  designbot: { AI_IMAGE: 20 },
  mockupbot: { AI_IMAGE: 20 },
  adminbot: {},
};

export function rateFor(bot: Bot, action: SpendAction): number {
  return CREDIT_RATES[bot]?.[action] ?? 0;
}
