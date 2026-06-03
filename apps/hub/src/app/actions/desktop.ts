'use server';

import { auth } from '@/auth';
import { rotateDesktopToken } from '@/lib/agent-token';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) throw new Error('로그인이 필요합니다');
  return userId;
}

/** 데스크톱 에이전트 토큰 재발급(기존 무효화). */
export async function rotateDesktopTokenAction(): Promise<{ ok: boolean; token?: string; error?: string }> {
  const userId = await requireUserId();
  try {
    const token = await rotateDesktopToken(userId);
    return { ok: true, token };
  } catch (e: any) {
    return { ok: false, error: e?.message || '재발급 실패' };
  }
}
