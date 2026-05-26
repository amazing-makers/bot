'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { generateInstagramImage, type ImageRatio } from '@/lib/ai/image-gen';
import { generateCaption, type CaptionTone } from '@/lib/ai/caption';
import { saveUserApiKey, deleteUserApiKey, listUserApiKeys, type AiProvider, AI_PROVIDERS } from '@/lib/api-keys';

async function requireUserId(): Promise<string> {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error('로그인이 필요합니다');
    return userId;
}

/** AI 이미지 생성 (Pollinations 무료) → 공개 URL. */
export async function generateImageAction(prompt: string, ratio: ImageRatio = 'square') {
    await requireUserId();
    return generateInstagramImage(prompt, ratio);
}

/** AI 캡션 생성 (BYOK Gemini/Groq). */
export async function generateCaptionAction(topic: string, tone: CaptionTone = 'friendly', hashtagCount = 8) {
    const userId = await requireUserId();
    return generateCaption(userId, { topic, tone, hashtagCount });
}

// ===== BYOK 키 관리 =====
export async function saveApiKeyAction(provider: string, key: string) {
    const userId = await requireUserId();
    if (!(AI_PROVIDERS as string[]).includes(provider)) return { ok: false as const, error: '지원하지 않는 provider' };
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
