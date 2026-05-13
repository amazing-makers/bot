/**
 * POST /api/checkout/credits
 *
 * Stripe Checkout Session 생성 → URL 반환 → frontend 가 redirect.
 * 결제 완료 시 /api/webhook/stripe 가 받아 addCredits 자동 호출.
 *
 * Body: { credits: number, priceKrw: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getStripe, CREDIT_PACKAGES } from '@/lib/stripe';

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email;
    if (!userId || !userEmail) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe 결제가 설정되지 않았습니다' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const credits = Number(body?.credits);
    const priceKrw = Number(body?.priceKrw);

    const pkg = CREDIT_PACKAGES.find(p => p.credits === credits && p.priceKrw === priceKrw);
    if (!pkg) return NextResponse.json({ error: '유효하지 않은 패키지' }, { status: 400 });

    const stripe = getStripe();
    const baseUrl = process.env.NEXTAUTH_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: userEmail,
        line_items: [{
            price_data: {
                currency: 'krw',
                product_data: {
                    name: `designbot ${pkg.credits} credits — ${pkg.label}`,
                    description: pkg.desc,
                },
                unit_amount: pkg.priceKrw,
            },
            quantity: 1,
        }],
        metadata: {
            userId,
            credits: String(credits),
            bot: 'designbot',
            kind: 'credit_purchase',
        },
        success_url: `${baseUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing?status=cancel`,
    });

    return NextResponse.json({ url: checkoutSession.url });
}
