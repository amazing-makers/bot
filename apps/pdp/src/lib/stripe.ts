/**
 * Stripe client wrapper.
 *
 * 사용:
 *   - Checkout Session (충전형): 사용자가 amount 선택 → Stripe Checkout → 결제 → webhook → addCredits.
 *   - 추후 Subscription (구독형): 같은 packages/billing 으로 통합 예정.
 *
 * 환경변수 (운영자 1회 등록):
 *   - STRIPE_SECRET_KEY       (sensitive)
 *   - STRIPE_WEBHOOK_SECRET   (sensitive — webhook endpoint 마다 발급)
 *   - STRIPE_PUBLISHABLE_KEY  (NEXT_PUBLIC_, frontend 에서 사용)
 */

import Stripe from 'stripe';

let client: Stripe | null = null;

export function getStripe(): Stripe {
    if (client) return client;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY 환경변수가 없습니다');
    client = new Stripe(key, {
        apiVersion: '2024-12-18.acacia' as any,
        typescript: true,
    });
    return client;
}

export function isStripeConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
}

/** 1 credit 가격 (KRW). 마진 + Stripe 수수료 (3.5% + ₩330) 고려. */
export const CREDIT_PRICE_KRW = 100; // 1 credit = ₩100

/** 충전형 패키지 정의 — 사용자에게 제시할 옵션. */
export const CREDIT_PACKAGES = [
    { credits: 100, priceKrw: 10_000, label: '🌱 Starter', desc: '이미지 ~2장 처리' },
    { credits: 500, priceKrw: 45_000, label: '☕ Light', desc: '이미지 ~12장 · 10% 할인' },
    { credits: 1500, priceKrw: 120_000, label: '🚀 Pro', desc: '이미지 ~36장 · 20% 할인' },
    { credits: 5000, priceKrw: 350_000, label: '🏢 Business', desc: '이미지 ~120장 · 30% 할인' },
] as const;
