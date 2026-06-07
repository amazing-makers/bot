'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectNaver } from '@/lib/blog-account';
import { rotateAgentToken } from '@/lib/agent-token';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) throw new Error('로그인이 필요합니다');
  return userId;
}

/** 네이버 블로그 연결 (blogId만; 발행은 데스크톱 에이전트). */
export async function connectNaverAction(blogId: string) {
  const userId = await requireUserId();
  const r = await connectNaver(userId, blogId);
  if (r.ok) revalidatePath('/dashboard/accounts');
  return r;
}

/** 네이버 에이전트 토큰 재발급. */
export async function rotateNaverTokenAction(): Promise<{ ok: boolean; token?: string; error?: string }> {
  const userId = await requireUserId();
  try {
    return { ok: true, token: await rotateAgentToken(userId) };
  } catch (e: any) {
    return { ok: false, error: e?.message || '재발급 실패' };
  }
}
