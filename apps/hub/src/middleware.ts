/**
 * 허브 미들웨어 — Edge-safe 설정만 import(pg/bcrypt 없음).
 * 미로그인 사용자는 로그인 페이지로. (로그인/가입/정적 자원은 통과)
 */

import NextAuth from 'next-auth';
import { buildAuthConfig } from '@amakers/auth/config';

export default NextAuth(buildAuthConfig()).auth;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|signup|privacy|terms|data-deletion).*)'],
};
