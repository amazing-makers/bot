import { NextResponse } from 'next/server';
import { prisma } from '@amakers/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbOk = false;
  try {
    await prisma.user.count();
    dbOk = true;
  } catch {
    dbOk = false;
  }
  return NextResponse.json({
    ok: dbOk,
    bot: 'hub',
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'missing',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'missing',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'set' : 'missing',
    },
  });
}
