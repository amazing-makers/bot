/**
 * POST /api/checkout/credits
 *
 * 사용자가 credits 충전을 시작 → Stripe Checkout Session 생성 → URL 반환 → frontend 가 redirect.
 * 결제 완료 시 webhook (/api/webhook/stripe) 가 받아 addCredits 자동 호출.
 *
 * Body:
 *   { credits: number, priceKrw: number }    // CREDIT_PACKAGES 중 하나의 정확한 값
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getStripe, CREDIT_PACKAGES } from '@/lib/stripe';

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    const userEmail = session?.user?.email;
    if (!userId || !userEmail) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    let credits: number;
    let priceKrw: number;
    try {
        const body = await req.json();
        credits = Number(body?.credits);
        priceKrw = Number(body?.priceKrw);
    } catch {
        return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
    }

    // 패키지 검증 — CREDIT_PACKAGES 에 정확히 매칭하는 항목만
    const pkg = CREDIT_PACKAGES.find(p => p.credits === credits && p.priceKrw === priceKrw);
    if (!pkg) {
        return NextResponse.json({ error: '유효하지 않은 패키지' }, { status: 400 });
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXTAUTH_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const session_ = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: userEmail,
        line_items: [{
            price_data: {
                currency: 'krw',
                product_data: {
                    name: `pdpbot ${pkg.credits} credits — ${pkg.label}`,
                    description: pkg.desc,
                },
                unit_amount: pkg.priceKrw, // KRW 는 zero-decimal currency
            },
            quantity: 1,
        }],
        // webhook 에서 사용자/credits 식별 위해 metadata
        metadata: {
            userId,
            credits: String(credits),
            bot: 'pdpbot',
            kind: 'credit_purchase',
        },
        success_url: `${baseUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pricing?status=cancel`,
    });

    return NextResponse.json({ url: session_.url });
}
