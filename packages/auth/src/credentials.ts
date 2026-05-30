/**
 * @amakers/auth — Credentials provider (Node 런타임 전용: bcrypt + @amakers/db).
 *
 * 공유 User 테이블 + bcrypt 해시 검증. 모든 봇이 같은 User 로 로그인.
 * ⚠️ pg/bcrypt 를 포함하므로 Edge(middleware)에서 import 금지 — server.ts 경유로만.
 */

import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@amakers/db';

export function createCredentialsProvider() {
  return Credentials({
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
  });
}
