'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { type ImageRatio } from '@/lib/ai/image-gen';
import { generateBlogPost, type BlogTone, type BlogLength } from '@/lib/ai/writer';
import { saveUserApiKey, deleteUserApiKey, listUserApiKeys, type AiProvider, AI_PROVIDERS } from '@/lib/api-keys';
import { validateApiKey, generateImageHosted } from '@amakers/ai';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) throw new Error('로그인이 필요합니다');
  return userId;
}

/** AI 이미지 생성 (BYOK Gemini → Blob) → 공개 URL. */
export async function generateImageAction(prompt: string, ratio: ImageRatio = 'square') {
  const userId = await requireUserId();
  return generateImageHosted(userId, prompt, ratio);
}

/** AI 블로그 글 생성 (BYOK Gemini/Groq) → 제목 + 마크다운 본문. */
export async function generateBlogPostAction(topic: string, tone: BlogTone = 'info', length: BlogLength = 'medium') {
  const userId = await requireUserId();
  return generateBlogPost(userId, { topic, tone, length });
}

// ===== BYOK 키 관리 (저장 시 실제 호출로 검증) =====
export async function saveApiKeyAction(provider: string, key: string) {
  const userId = await requireUserId();
  if (!(AI_PROVIDERS as string[]).includes(provider)) return { ok: false as const, error: '지원하지 않는 provider' };
  const valid = await validateApiKey(provider as AiProvider, key);
  if (!valid.ok) return { ok: false as const, error: valid.error };
  try {
    const { maskedHint } = await saveUserApiKey(userId, provider as AiProvider, key);
    revalidatePath('/dashboard/settings/ai');
    return { ok: true as const, maskedHint };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || '저장 실패' };
  }
}

export async function deleteApiKeyAction(provider: string) {
  const userId = await requireUserId();
  const ok = await deleteUserApiKey(userId, provider as AiProvider);
  revalidatePath('/dashboard/settings/ai');
  return { ok };
}

export async function listApiKeysAction() {
  const userId = await requireUserId();
  return listUserApiKeys(userId);
}
