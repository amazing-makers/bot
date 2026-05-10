/**
 * POST /api/webhook/stripe
 *
 * Stripe webhook 받기 — 결제 완료 (checkout.session.completed) 시 자동으로 credits 충전.
 *
 * 환경변수 (운영자 등록):
 *   STRIPE_WEBHOOK_SECRET  ← Stripe Dashboard → Webhooks → endpoint 생성 시 발급
 *
 * 등록 endpoint URL:
 *   https://pdpbot.amakers.co.kr/api/webhook/stripe
 *
 * 받을 이벤트:
 *   - checkout.session.completed  (충전 완료)
 *   - 추후: customer.subscription.* (구독)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { addCredits } from '@/lib/credit';

// Stripe 는 raw body 검증 — Next 16 에서 await req.text() 후 verify.
export async function POST(req: NextRequest) {
    const sig = req.headers.get('stripe-signature');
    if (!sig) return NextResponse.json({ error: 'no signature' }, { status: 400 });

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET 환경변수 미설정');
        return NextResponse.json({ error: 'webhook not configured' }, { status: 500 });
    }

    const body = await req.text();
    const stripe = getStripe();

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, secret);
    } catch (e: any) {
        console.error('[stripe webhook] signature verify failed', e?.message);
        return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const s = event.data.object as any;
                const userId = s.metadata?.userId;
                const credits = parseInt(s.metadata?.credits || '0', 10);
                const kind = s.metadata?.kind;

                if (!userId || !credits || kind !== 'credit_purchase') {
                    console.warn('[stripe webhook] checkout.session.completed 무시 — metadata 부족', s.metadata);
                    break;
                }
                if (s.payment_status !== 'paid') {
                    console.warn('[stripe webhook] payment_status=' + s.payment_status + ' — credits 미충전');
                    break;
                }

                const r = await addCredits(userId, credits, 'pdpbot', 'PURCHASE', {
                    stripeSessionId: s.id,
                    amountTotal: s.amount_total,
                    currency: s.currency,
                });
                console.log(`[stripe webhook] credits 충전 — user=${userId} +${credits} balance=${r.balanceAfter}`);
                break;
            }
            default:
                // 다른 이벤트는 무시
                break;
        }
    } catch (e) {
        console.error('[stripe webhook] handler error', e);
        return NextResponse.json({ error: 'handler error' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
