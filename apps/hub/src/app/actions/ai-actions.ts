'use server';

import { auth } from '@/auth';
import { generateBlogPost, type BlogTone, type BlogLength, type ImageRatio } from '@amakers/ai';
import { generateImageHosted } from '@/lib/image-hosted';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) throw new Error('로그인이 필요합니다');
  return userId;
}

/** AI 글 생성 (BYOK) → 제목 + 마크다운 본문. */
export async function generateBlogPostAction(topic: string, tone: BlogTone = 'info', length: BlogLength = 'medium') {
  const userId = await requireUserId();
  return generateBlogPost(userId, { topic, tone, length });
}

/** AI 이미지 생성 (BYOK Gemini → Blob) → 공개 URL. */
export async function generateImageAction(prompt: string, ratio: ImageRatio = 'landscape') {
  const userId = await requireUserId();
  return generateImageHosted(userId, prompt, ratio);
}
