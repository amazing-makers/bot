import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { prisma } from './lib/prisma';
import { isAdminEmail } from '@amakers/auth';

/**
 * Admin 앱 NextAuth.
 *
 * - marketingbot 과 같은 user 테이블 사용 (Supabase 공유)
 * - 비밀번호 검증은 marketingbot 의 bcrypt 해시와 호환되어야 함
 *   → 여기서는 admin email 화이트리스트만 통과
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

                // 화이트리스트 우선 차단
                if (!isAdminEmail(email)) return null;

                const user = await prisma.user.findUnique({
                    where: { email },
                    select: { id: true, email: true, name: true, role: true },
                });
                if (!user) return null;

                // ⚠️ 실제 비밀번호 검증은 marketingbot 의 bcrypt 호환 필요.
                // 추후 packages/auth 로 이전 — 임시로 환경변수 ADMIN_PASSWORD 비교 (개발용).
                if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
                    return { id: user.id, email: user.email, name: user.name };
                }
                return null;
            },
        }),
    ],
    session: { strategy: 'jwt' },
});
