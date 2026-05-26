import { NextRequest, NextResponse } from 'next/server';
import { dispatchDueScheduled } from '@/lib/publish';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 예약 자동발행 cron — scheduledAt 도래한 SCHEDULED 글 발행.
 *
 * 보안: CRON_SECRET 환경변수 필요.
 *   - Vercel Cron: CRON_SECRET 설정 시 자동으로 `Authorization: Bearer <CRON_SECRET>` 헤더 전송.
 *   - 수동 트리거: `?secret=<CRON_SECRET>` 쿼리도 허용.
 */
async function handle(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return NextResponse.json({ error: 'CRON_SECRET 미설정' }, { status: 500 });
    }
    const auth = req.headers.get('authorization');
    const fromHeader = auth === `Bearer ${secret}`;
    const fromQuery = req.nextUrl.searchParams.get('secret') === secret;
    if (!fromHeader && !fromQuery) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const summary = await dispatchDueScheduled();
    return NextResponse.json({ ok: true, ...summary, at: new Date().toISOString() });
}

export async function GET(req: NextRequest) {
    return handle(req);
}
export async function POST(req: NextRequest) {
    return handle(req);
}
