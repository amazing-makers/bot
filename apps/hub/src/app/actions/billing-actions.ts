'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { createTopupCheckout, isStripeConfigured } from '@amakers/billing';

/** 크레딧 패키지 구매 시작 → Stripe Checkout 으로 리다이렉트. */
export async function startTopup(packageId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!isStripeConfigured()) redirect('/billing?status=unconfigured');

  const base = process.env.NEXTAUTH_URL || 'http://localhost:3050';
  const { url } = await createTopupCheckout({
    userId: (session.user as any).id,
    packageId,
    successUrl: `${base}/billing?status=success`,
    cancelUrl: `${base}/billing?status=cancel`,
    customerEmail: session.user.email ?? undefined,
  });

  if (url) redirect(url);
  redirect('/billing?status=error');
}
