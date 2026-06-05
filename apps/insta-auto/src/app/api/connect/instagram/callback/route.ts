import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectAccount } from '@/lib/instagram-account';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Instagram 로그인 콜백 — code → 단기토큰(+user_id) → 장기토큰(60일) → 계정 자동 연결.
 * 페이스북 불필요.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const base = (process.env.NEXTAUTH_URL || req.nextUrl.origin).replace(/\/$/, '');
  const back = (qs: string) => NextResponse.redirect(`${base}/dashboard/accounts?${qs}`);
  if (!userId) return NextResponse.redirect(`${base}/login`);

  const code = req.nextUrl.searchParams.get('code');
  const oerr = req.nextUrl.searchParams.get('error_description') || req.nextUrl.searchParams.get('error');
  if (oerr || !code) return back(`error=${encodeURIComponent(oerr || '인증이 취소되었어요')}`);

  const igAppId = process.env.IG_APP_ID;
  const igSecret = process.env.IG_APP_SECRET;
  if (!igAppId || !igSecret) return back(`error=${encodeURIComponent('인스타 앱이 아직 설정되지 않았어요(관리자)')}`);
  const redirectUri = `${base}/api/connect/instagram/callback`;

  try {
    // 1) code → 단기 토큰 + user_id (form POST)
    const form = new URLSearchParams();
    form.set('client_id', igAppId);
    form.set('client_secret', igSecret);
    form.set('grant_type', 'authorization_code');
    form.set('redirect_uri', redirectUri);
    form.set('code', code.replace(/#_$/, '')); // 인스타가 붙이는 #_ 제거
    const r1 = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const t1 = await r1.json();
    const shortToken = t1.access_token;
    const igUserId = String(t1.user_id || t1.user?.id || '');
    if (!shortToken || !igUserId) return back(`error=${encodeURIComponent('토큰 교환 실패: ' + (t1.error_message || t1.error?.message || JSON.stringify(t1).slice(0, 120)))}`);

    // 2) 장기 토큰(60일)
    const r2 = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${igSecret}&access_token=${shortToken}`);
    const t2 = await r2.json();
    const longToken = t2.access_token || shortToken;

    // 3) 검증 + 저장
    const res = await connectAccount(userId, longToken, igUserId);
    if (res.ok) return back(`connected=1`);
    return back(`error=${encodeURIComponent(res.error || '계정 연결 실패')}`);
  } catch (e: any) {
    return back(`error=${encodeURIComponent(e?.message || 'OAuth 처리 오류')}`);
  }
}
