import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { prisma } from './lib/prisma';
import { isAdminEmail } from '@amakers/auth';

/**
 * Admin 앱 NextAuth.
 *
 * 인증 흐름:
 *   1. 이메일·비밀번호로 User 테이블 조회 (marketingbot 과 같은 Supabase 공유)
 *   2. bcrypt 로 비밀번호 검증 (marketingbot 과 동일 해시)
 *   3. user.role === 'ADMIN' 또는 ADMIN_EMAILS env 화이트리스트 통과 시 로그인 허용
 *
 * 즉, 운영 중 새 admin 추가 = User.role 을 ADMIN 으로 승격하면 끝 (재배포 불필요).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: {},
                password: {},
            },
            async authorize(credentials) {
                const email = String(credentials?.email || '').toLowerCase();
                const password = String(credentials?.password || '');
                if (!email || !password) return null;

                const user = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true, email: true, name: true, role: true, password: true },
                });
                if (!user) return null;

                // 권한 게이트: role=ADMIN 이거나 env 화이트리스트
                if (!isAdminEmail(email, user.role)) return null;

                // 비밀번호 검증 (bcrypt)
                const ok = await bcrypt.compare(password, user.password);
                if (!ok) return null;

                return { id: user.id, email: user.email, name: user.name, role: user.role } as any;
            },
        }),
    ],
    session: { strategy: 'jwt' },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                (token as any).id = (user as any).id;
                (token as any).role = (user as any).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token) {
                (session.user as any).id = (token as any).id;
                (session.user as any).role = (token as any).role;
            }
            return session;
        },
    },
});
