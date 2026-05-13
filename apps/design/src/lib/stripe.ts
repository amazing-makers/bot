/**
 * Stripe client — designbot 결제.
 *
 * pdpbot 과 같은 Stripe 계정 사용 (운영자 1개 계정).
 * webhook endpoint 는 각 봇 별도 등록 → 메타데이터 bot 필드로 구분.
 *
 * 환경변수 (pdpbot 과 같은 값 사용 가능):
 *   STRIPE_SECRET_KEY       — https://dashboard.stripe.com → API keys
 *   STRIPE_WEBHOOK_SECRET   — webhook endpoint 마다 별도 발급
 *   STRIPE_PUBLISHABLE_KEY  — (선택) 프론트엔드용
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

/** 1 credit 가격 (KRW). pdpbot 과 동일한 단가. */
export const CREDIT_PRICE_KRW = 100; // 1 credit = ₩100

/** 충전형 패키지 — designbot 용 (디자인 작업량 기준 설명 추가). */
export const CREDIT_PACKAGES = [
    {
        credits: 100,
        priceKrw: 10_000,
        label: '🌱 Starter',
        desc: 'AI 디자인 ~6건 생성',
    },
    {
        credits: 500,
        priceKrw: 45_000,
        label: '☕ Light',
        desc: 'AI 디자인 ~35건 · 10% 할인',
    },
    {
        credits: 1500,
        priceKrw: 120_000,
        label: '🚀 Pro',
        desc: 'AI 디자인 ~100건 · 20% 할인',
    },
    {
        credits: 5000,
        priceKrw: 350_000,
        label: '🏢 Business',
        desc: 'AI 디자인 ~350건 · 30% 할인',
    },
] as const;
