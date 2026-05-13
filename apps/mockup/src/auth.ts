import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { prisma } from './lib/prisma';

/**
 * mockupbot NextAuth — 마케팅봇과 같은 User 테이블 + 같은 bcrypt 해시 + 같은 NEXTAUTH_SECRET 사용.
 *
 * 결과: 한 봇에서 로그인 → 모든 봇 자동 로그인 (SSO, 쿠키 도메인 .amakers.co.kr 공유).
 * 새 사용자 회원가입은 마케팅봇에서 (또는 추후 통합 회원가입 페이지) — 같은 User 가 모든 봇 사용.
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

                const ok = await bcrypt.compare(password, user.password);
                if (!ok) return null;

                return { id: user.id, email: user.email, name: user.name, role: user.role } as any;
            },
        }),
    ],
});
