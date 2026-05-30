/**
 * @amakers/billing — 구독 플랜 → 월 크레딧 그랜트 매핑 (구독→크레딧 브리지).
 *
 * 마케팅봇은 기존에 Stripe 구독제(FREE/STARTER/PRO/BUSINESS)였다.
 * 통합 크레딧 전환 후: 구독 갱신 시점에 plan 별 월 크레딧을 SUBSCRIPTION_GRANT 로 지급한다.
 * (실제 grant cron 가동은 마케팅봇 모노레포 이전 단계 M2 — 여기선 매핑만 정의.)
 */

export const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  FREE: 100,
  STARTER: 1_500,
  PRO: 6_000,
  BUSINESS: 30_000,
};

export function monthlyCreditsFor(plan: string | null | undefined): number {
  if (!plan) return PLAN_MONTHLY_CREDITS.FREE;
  return PLAN_MONTHLY_CREDITS[plan.toUpperCase()] ?? PLAN_MONTHLY_CREDITS.FREE;
}
