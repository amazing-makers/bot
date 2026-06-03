import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectAccount } from '@/lib/instagram-account';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const GRAPH = 'https://graph.facebook.com/v21.0';

/** Facebook OAuth 콜백 — code → 장기토큰 → 페이지의 IG 비즈니스 계정 → 자동 연결. */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const base = (process.env.NEXTAUTH_URL || req.nextUrl.origin).replace(/\/$/, '');
  const back = (qs: string) => NextResponse.redirect(`${base}/dashboard/accounts?${qs}`);
  if (!userId) return NextResponse.redirect(`${base}/login`);

  const code = req.nextUrl.searchParams.get('code');
  const oerr = req.nextUrl.searchParams.get('error_description') || req.nextUrl.searchParams.get('error');
  if (oerr || !code) return back(`error=${encodeURIComponent(oerr || '인증이 취소되었어요')}`);

  const appId = process.env.META_APP_ID;
  const secret = process.env.META_APP_SECRET;
  if (!appId || !secret) return back(`error=${encodeURIComponent('Meta 앱이 아직 설정되지 않았어요(관리자)')}`);
  const redirectUri = `${base}/api/connect/instagram/callback`;

  try {
    // 1) code → 단기 토큰
    const r1 = await fetch(`${GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${secret}&code=${encodeURIComponent(code)}`);
    const t1 = await r1.json();
    if (!t1.access_token) return back(`error=${encodeURIComponent('토큰 교환 실패: ' + (t1.error?.message || ''))}`);

    // 2) 장기 토큰(60일)
    const r2 = await fetch(`${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${secret}&fb_exchange_token=${t1.access_token}`);
    const t2 = await r2.json();
    const userToken = t2.access_token || t1.access_token;

    // 3) 내 페이지들 + 각 페이지의 IG 비즈니스 계정
    const r3 = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userToken}`);
    const pages = await r3.json();
    const list: any[] = pages.data || [];

    let connected = 0;
    let lastErr = '';
    for (const pg of list) {
      const igId = pg.instagram_business_account?.id;
      if (!igId) continue;
      const pageToken = pg.access_token || userToken;
      const res = await connectAccount(userId, pageToken, igId);
      if (res.ok) connected++;
      else lastErr = res.error || '';
    }

    if (connected > 0) return back(`connected=${connected}`);
    return back(`error=${encodeURIComponent(lastErr || '연결할 인스타 비즈니스 계정을 못 찾았어요. 인스타가 비즈니스 계정이고 페이스북 페이지에 연결됐는지 확인하세요.')}`);
  } catch (e: any) {
    return back(`error=${encodeURIComponent(e?.message || 'OAuth 처리 오류')}`);
  }
}
