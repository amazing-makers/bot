/**
 * @amakers/ai — 호스팅 이미지 생성 (BYOK Gemini → Vercel Blob 공개 URL).
 * Pollinations 무료가 IP 큐 제한(402)으로 막혀, 사용자 Gemini 키로 이미지를 생성하고
 * 호출 앱의 Blob(BLOB_READ_WRITE_TOKEN)에 저장한다. Blob 미설정 시 친절 안내.
 */

import { put } from '@vercel/blob';
import { getUserApiKey } from './api-keys';
import type { ImageRatio } from './image';

const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';
const RATIO_HINT: Record<ImageRatio, string> = {
  square: '정사각형(1:1)',
  portrait: '세로(4:5)',
  story: '세로 스토리(9:16)',
  landscape: '가로(16:9)',
};

export interface HostedImageResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** 사용자 Gemini 키로 이미지 생성 → Blob 저장 → 공개 URL. */
export async function generateImageHosted(userId: string, prompt: string, ratio: ImageRatio = 'square'): Promise<HostedImageResult> {
  const p = (prompt || '').trim();
  if (!p) return { ok: false, error: '이미지 설명을 입력하세요' };

  const key = await getUserApiKey(userId, 'gemini');
  if (!key) {
    return { ok: false, error: '이미지 생성에는 Gemini 키가 필요해요(무료 Pollinations가 막힘). 설정에서 Gemini 키를 등록하세요.' };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { ok: false, error: '이미지 저장소(Blob)가 설정되지 않았습니다.' };
  }

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `다음을 고품질 사진 이미지로 생성: ${p}. 비율 ${RATIO_HINT[ratio]}.` }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) {
      const body = (await r.text()).slice(0, 200);
      if (/quota|RESOURCE_EXHAUSTED|\b429\b/i.test(body)) return { ok: false, error: 'Gemini 무료 사용량 초과 — 잠시 후 다시 시도하세요.' };
      return { ok: false, error: `이미지 생성 실패 (Gemini ${r.status})` };
    }
    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const img = parts.find((x: any) => x?.inlineData?.data);
    if (!img) return { ok: false, error: '이미지 응답이 비어있어요 — 다시 시도하세요.' };

    const buf = Buffer.from(img.inlineData.data, 'base64');
    const mime = img.inlineData.mimeType || 'image/png';
    const ext = mime.includes('jpeg') ? 'jpg' : 'png';
    const blob = await put(`ai-images/${userId}/${Date.now()}.${ext}`, buf, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: mime,
      addRandomSuffix: true,
    });
    return { ok: true, url: blob.url };
  } catch (e: any) {
    return { ok: false, error: e?.name === 'TimeoutError' ? '이미지 생성 시간 초과 — 다시 시도하세요.' : (e?.message || '이미지 생성 오류') };
  }
}
