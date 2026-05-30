/**
 * @amakers/billing — 통합 크레딧 지갑 + Stripe 충전 + 리셀러 commission.
 *
 *   import { getBalance, spendCredits, addCredits, CREDIT_RATES, rateFor } from '@amakers/billing';
 *   import { createTopupCheckout, fulfillTopup, CREDIT_PACKAGES } from '@amakers/billing';
 */

// 통합 크레딧 지갑
export {
  spendCredits,
  addCredits,
  getBalance,
  listTransactions,
  type SpendInput,
  type SpendResult,
  type Bot,
  type SpendAction,
} from './credit';

// 단가표
export { CREDIT_RATES, rateFor, type LedgerAction } from './rates';

// Stripe 충전
export {
  isStripeConfigured,
  getStripe,
  CREDIT_PACKAGES,
  findPackage,
  createTopupCheckout,
  fulfillTopup,
  type CreditPackage,
} from './topup';

// 구독 → 크레딧 매핑 (M2 브리지)
export { PLAN_MONTHLY_CREDITS, monthlyCreditsFor } from './plans';

// ===== 리셀러 commission (기존 유지) =====
export const COMMISSION_DEFAULT_RATE = 0.1; // 10%

export function calcCommission(revenueKrw: number, rate: number = COMMISSION_DEFAULT_RATE): number {
  if (revenueKrw <= 0) return 0;
  return Math.round(revenueKrw * rate);
}

export function toYearMonth(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
