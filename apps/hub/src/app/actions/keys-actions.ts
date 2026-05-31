'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { saveUserApiKey, deleteUserApiKey, validateApiKey, type AiProvider } from '@amakers/ai';

export interface KeyActionResult {
  ok: boolean;
  error?: string;
  maskedHint?: string;
}

/** AI 키 등록 — 실제 호출로 유효성 검증 후 암호화 저장. */
export async function saveKey(provider: AiProvider, key: string): Promise<KeyActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: '로그인이 필요합니다.' };
  const userId = (session.user as any).id as string;

  const valid = await validateApiKey(provider, key);
  if (!valid.ok) return { ok: false, error: valid.error };

  const { maskedHint } = await saveUserApiKey(userId, provider, key);
  revalidatePath('/keys');
  revalidatePath('/');
  return { ok: true, maskedHint };
}

/** AI 키 삭제. */
export async function removeKey(provider: AiProvider): Promise<KeyActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: '로그인이 필요합니다.' };
  const userId = (session.user as any).id as string;
  await deleteUserApiKey(userId, provider);
  revalidatePath('/keys');
  revalidatePath('/');
  return { ok: true };
}
