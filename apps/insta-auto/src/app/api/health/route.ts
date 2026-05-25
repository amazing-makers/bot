import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** 서비스 생존 확인 (Vercel/모니터링용). */
export async function GET() {
    return NextResponse.json({ ok: true, bot: 'instaauto', time: new Date().toISOString() });
}
