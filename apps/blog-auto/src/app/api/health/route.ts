import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ ok: true, bot: 'blogauto', time: new Date().toISOString() });
}
