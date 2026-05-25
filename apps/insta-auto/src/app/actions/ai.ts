'use server';

import { auth } from '@/auth';
import { generateInstagramImage, type ImageRatio } from '@/lib/ai/image-gen';

async function requireUserId(): Promise<string> {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error('로그인이 필요합니다');
    return userId;
}

/** AI 이미지 생성 (Pollinations 무료) → 공개 URL 반환. */
export async function generateImageAction(prompt: string, ratio: ImageRatio = 'square') {
    await requireUserId();
    return generateInstagramImage(prompt, ratio);
}
