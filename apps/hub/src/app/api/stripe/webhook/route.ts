import { NextRequest, NextResponse } from 'next/server';
import { getStripe, fulfillTopup, isStripeConfigured } from '@amakers/billing';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, error: 'stripe not configured' }, { status: 503 });
  }
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get('stripe-signature');
  if (!whsec || !sig) {
    return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  }

  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, whsec);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    await fulfillTopup(event.data.object as any);
  }

  return NextResponse.json({ received: true });
}
