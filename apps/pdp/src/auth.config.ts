import type { NextAuthConfig } from 'next-auth';

/**
 * pdpbot NextAuth 설정.
 *
 * SSO: 쿠키 도메인 .amakers.co.kr 으로 설정 — pdpbot.amakers.co.kr 에서 로그인하면
 *      marketingbot.amakers.co.kr / adminbot.amakers.co.kr 등 다른 봇에서도 자동 로그인.
 *      모든 봇이 같은 NEXTAUTH_SECRET 사용해야 동일 JWT 검증 가능.
 *
 * 단일 도메인 (예: localhost) 에서는 cookies.sessionToken.options.domain 을 비워두는 게 안전.
 * → production 에서만 .amakers.co.kr 적용.
 */
export const authConfig: NextAuthConfig = {
    pages: {
        signIn: '/login',
    },
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
    providers: [], // auth.ts 에서 주입
};
