import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { prisma } from './lib/prisma';

/**
 * blogbot NextAuth — 다른 봇과 같은 User 테이블 + 같은 bcrypt 해시 + 같은 NEXTAUTH_SECRET (SSO).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: { email: {}, password: {} },
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
