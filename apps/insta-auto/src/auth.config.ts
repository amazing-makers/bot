import type { NextAuthConfig } from 'next-auth';

/**
 * instaauto NextAuth 설정.
 *
 * SSO: 쿠키 도메인 .amakers.co.kr → instaauto.amakers.co.kr 에서 로그인하면
 *      marketingbot / pdpbot 등 다른 봇에서도 자동 로그인.
 *      모든 봇이 같은 NEXTAUTH_SECRET 사용해야 동일 JWT 검증 가능.
 *
 * 단일 도메인 (localhost) 에서는 cookies.sessionToken.options.domain 을 비워둠.
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
