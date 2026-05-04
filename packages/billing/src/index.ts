/**
 * @amakers/billing — Stripe 결제·구독·리셀러 commission 계산
 *
 * 추후 추가:
 *  - getStripeClient()
 *  - calculateMonthlyCommission(userId, yearMonth) → ResellerSummary
 *  - applyReferralOnSignup(userId, code)
 */

export const COMMISSION_DEFAULT_RATE = 0.10; // 10%

/**
 * 월별 사용자 결제액에서 리셀러 commission 계산
 */
export function calcCommission(revenueKrw: number, rate: number = COMMISSION_DEFAULT_RATE): number {
    if (revenueKrw <= 0) return 0;
    return Math.round(revenueKrw * rate);
}

/**
 * "2026-05" 형식의 yyyy-MM 문자열 만들기
 */
export function toYearMonth(date: Date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}
