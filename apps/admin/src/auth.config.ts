import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
    // Vercel 등 프록시 뒤에서 host header 신뢰 (CSRF 쿠키 정상 발급 위해 필수)
    trustHost: true,
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const onLogin = nextUrl.pathname === '/login';
            if (onLogin) {
                if (isLoggedIn) return Response.redirect(new URL('/', nextUrl));
                return true;
            }
            // 모든 다른 라우트 = 로그인 필요
            return isLoggedIn;
        },
    },
    providers: [],
};
