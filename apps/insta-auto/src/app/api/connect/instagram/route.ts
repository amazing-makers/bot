import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/**
 * 인스타 연결 시작 — Instagram 로그인(페이스북 불필요).
 * 고객은 인스타 계정으로 바로 로그인 → 권한 승인. (비즈니스/크리에이터 계정 필요)
 */
const SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const base = (process.env.NEXTAUTH_URL || req.nextUrl.origin).replace(/\/$/, '');
  if (!userId) return NextResponse.redirect(`${base}/login`);

  const igAppId = process.env.IG_APP_ID;
  if (!igAppId) return NextResponse.redirect(`${base}/dashboard/accounts?error=${encodeURIComponent('인스타 앱이 아직 설정되지 않았어요(관리자)')}`);

  const redirectUri = `${base}/api/connect/instagram/callback`;
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', igAppId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(','));
  return NextResponse.redirect(url.toString());
}
