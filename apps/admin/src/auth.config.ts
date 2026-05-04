import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
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
