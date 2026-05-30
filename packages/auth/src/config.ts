/**
 * @amakers/auth/config — Edge-safe NextAuth 설정 (provider/pg/bcrypt 없음).
 *
 * middleware(Edge 런타임)에서 import 가능. 실제 자격증명 검증(Credentials provider)은
 * @amakers/auth/server 의 createAuth/createCredentialsProvider 에서 주입한다.
 *
 * SSO: NEXTAUTH_URL 이 amakers.co.kr 을 포함하면 세션 쿠키를 `.amakers.co.kr` 도메인 +
 *      `__Secure-authjs.session-token` 이름으로 발급 → 모든 *.amakers.co.kr 봇이 자동 로그인.
 *      ⚠️ 전 앱이 동일 NEXTAUTH_SECRET 을 써야 JWT 상호 검증 가능.
 *      단일 도메인(localhost)에서는 쿠키 domain 을 비워둠.
 */

import type { NextAuthConfig } from 'next-auth';

export interface BuildAuthConfigOptions {
  /** 로그인 페이지 경로 (기본 /login) */
  signInPath?: string;
}

export function buildAuthConfig(opts: BuildAuthConfigOptions = {}): NextAuthConfig {
  const signIn = opts.signInPath ?? '/login';

  return {
    pages: { signIn },
    trustHost: true,
    session: { strategy: 'jwt' },
    cookies: process.env.NEXTAUTH_URL?.includes('amakers.co.kr')
      ? {
          sessionToken: {
            name: '__Secure-authjs.session-token',
            options: {
              httpOnly: true,
              sameSite: 'lax',
              path: '/',
              secure: true,
              domain: '.amakers.co.kr', // 모든 봇 SSO 공유
            },
          },
        }
      : {},
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = (user as any).id;
          token.role = (user as any).role;
        }
        return token;
      },
      async session({ session, token }) {
        if (token && session.user) {
          (session.user as any).id = token.id;
          (session.user as any).role = token.role;
        }
        return session;
      },
    },
    providers: [], // server.ts(createAuth)에서 주입. middleware 는 빈 배열로 OK.
  };
}
