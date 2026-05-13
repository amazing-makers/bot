/**
 * POST /api/webhook/stripe
 *
 * Stripe webhook — checkout.session.completed → credits 충전.
 *
 * Stripe Dashboard → Webhooks → endpoint:
 *   URL: https://designbot.amakers.co.kr/api/webhook/stripe
 *   Events: checkout.session.completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { addCredits } from '@/lib/credit';

export async function POST(req: NextRequest) {
    const sig = req.headers.get('stripe-signature');
    if (!sig) return NextResponse.json({ error: 'no signature' }, { status: 400 });

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
        console.error('[designbot stripe webhook] STRIPE_WEBHOOK_SECRET 미설정');
        return NextResponse.json({ error: 'webhook not configured' }, { status: 500 });
    }

    const body = await req.text();
    let event: any;
    try {
        event = getStripe().webhooks.constructEvent(body, sig, secret);
    } catch (e: any) {
        console.error('[designbot stripe webhook] signature verify failed', e?.message);
        return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const s = event.data.object as any;
            const { userId, credits: creditsStr, kind, bot } = s.metadata || {};

            if (!userId || !creditsStr || kind !== 'credit_purchase' || bot !== 'designbot') {
                console.warn('[designbot stripe webhook] metadata 부족 또는 봇 불일치', s.metadata);
            } else if (s.payment_status !== 'paid') {
                console.warn('[designbot stripe webhook] payment_status=' + s.payment_status);
            } else {
                const r = await addCredits(userId, parseInt(creditsStr, 10), 'designbot', 'PURCHASE', {
                    stripeSessionId: s.id,
                    amountTotal: s.amount_total,
                    currency: s.currency,
                });
                console.log(`[designbot stripe webhook] +${creditsStr} credits → user ${userId} balance=${r.balanceAfter}`);
            }
        }
    } catch (e) {
        console.error('[designbot stripe webhook] handler error', e);
        return NextResponse.json({ error: 'handler error' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
