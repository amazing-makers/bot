/**
 * @amakers/billing — Stripe 크레딧 충전 (pay-as-you-go).
 *
 * 허브 /billing 에서 크레딧 패키지 구매 → Stripe Checkout → webhook 으로 addCredits(PURCHASE).
 * Stripe 미설정(STRIPE_SECRET_KEY 없음) 환경에선 isStripeConfigured()=false 로 충전 UI 만 비활성화.
 */

import Stripe from 'stripe';
import { addCredits } from './credit';

let _stripe: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY 미설정');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** 구매 가능한 크레딧 패키지 (원 단위). 1크레딧 ≈ 1원 기준 + 보너스. */
export interface CreditPackage {
  id: string;
  credits: number;
  priceKrw: number;
  label: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'pack_10k', credits: 10_000, priceKrw: 10_000, label: '10,000 크레딧' },
  { id: 'pack_30k', credits: 33_000, priceKrw: 30_000, label: '33,000 크레딧 (+10% 보너스)' },
  { id: 'pack_100k', credits: 120_000, priceKrw: 100_000, label: '120,000 크레딧 (+20% 보너스)' },
];

export function findPackage(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === id);
}

/** 크레딧 충전 Checkout Session 생성. metadata 에 userId/credits 를 실어 webhook 에서 적립. */
export async function createTopupCheckout(params: {
  userId: string;
  packageId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<{ url: string | null }> {
  const pkg = findPackage(params.packageId);
  if (!pkg) throw new Error(`알 수 없는 크레딧 패키지: ${params.packageId}`);

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: params.customerEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'krw',
          unit_amount: pkg.priceKrw,
          product_data: { name: `Amakers ${pkg.label}` },
        },
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      kind: 'credit_topup',
      userId: params.userId,
      packageId: pkg.id,
      credits: String(pkg.credits),
    },
  });

  return { url: session.url };
}

/**
 * Stripe webhook 의 checkout.session.completed 처리 — 크레딧 적립.
 * 멱등: Stripe 가 동일 이벤트를 재전송해도 session.id 를 refId 로 써서 한 번만 적립하도록
 *       호출 측에서 보장하거나, 여기서 refId=session.id 로 기록(상위에서 중복 체크 권장).
 */
export async function fulfillTopup(session: Stripe.Checkout.Session): Promise<{ applied: boolean }> {
  if (session.metadata?.kind !== 'credit_topup') return { applied: false };
  const userId = session.metadata.userId;
  const credits = Number(session.metadata.credits || 0);
  if (!userId || credits <= 0) return { applied: false };

  await addCredits(userId, credits, 'marketingbot', 'PURCHASE', {
    refType: 'stripe_checkout',
    refId: session.id,
    metadata: { amountKrw: session.amount_total, packageId: session.metadata.packageId },
  });
  return { applied: true };
}
