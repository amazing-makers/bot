'use server';

import bcrypt from 'bcryptjs';
import { prisma } from '@amakers/db';

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

/** 회원가입 — 공유 User 테이블에 무료 계정 생성. 이후 client 가 signIn 호출. */
export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<RegisterResult> {
  const email = (input.email || '').trim().toLowerCase();
  const password = input.password || '';
  const name = (input.name || '').trim() || null;

  if (!email || !password) return { ok: false, error: '이메일과 비밀번호를 입력하세요.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: '올바른 이메일 형식이 아닙니다.' };
  if (password.length < 8) return { ok: false, error: '비밀번호는 8자 이상이어야 합니다.' };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: '이미 가입된 이메일입니다. 로그인해 주세요.' };

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, password: hash, name },
  });

  return { ok: true };
}
