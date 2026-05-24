import type { NextAuthConfig } from 'next-auth';

/**
 * blogbot NextAuth 설정. SSO 쿠키 도메인 .amakers.co.kr (다른 봇과 같은 NEXTAUTH_SECRET).
 * localhost 에서는 도메인 비움.
 */
export const authConfig: NextAuthConfig = {
    pages: { signIn: '/login' },
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
                      domain: '.amakers.co.kr',
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
    providers: [],
};
