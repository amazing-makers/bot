import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

/** 인스타 연결 시작 — 고객을 Facebook OAuth 동의 화면으로 보낸다(플랫폼 단일 Meta 앱 사용). */
const SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
];

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  const base = (process.env.NEXTAUTH_URL || req.nextUrl.origin).replace(/\/$/, '');
  if (!userId) return NextResponse.redirect(`${base}/login`);

  const appId = process.env.META_APP_ID;
  if (!appId) return NextResponse.redirect(`${base}/dashboard/accounts?error=${encodeURIComponent('Meta 앱이 아직 설정되지 않았어요(관리자)')}`);

  const redirectUri = `${base}/api/connect/instagram/callback`;
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES.join(','));
  url.searchParams.set('response_type', 'code');
  return NextResponse.redirect(url.toString());
}
