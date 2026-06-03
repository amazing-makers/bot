/**
 * @amakers/ai — 호스팅 이미지 생성 → Vercel Blob 공개 URL.
 *
 * 우선순위:
 *   1) Pollinations + POLLINATIONS_TOKEN (무료 토큰, IP 큐 제한 우회) — 서버에서 이미지 받아 Blob 저장
 *   2) BYOK Gemini 이미지 모델 (접근 권한 있는 사용자만)
 * 둘 다 안 되면 친절 안내.
 */

import { put } from '@vercel/blob';
import { getUserApiKey } from './api-keys';
import { buildPollinationsUrl, type ImageRatio } from './image';

const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-preview-image-generation',
];
const RATIO_HINT: Record<ImageRatio, string> = {
  square: '정사각형(1:1)', portrait: '세로(4:5)', story: '세로 스토리(9:16)', landscape: '가로(16:9)',
};

export interface HostedImageResult {
  ok: boolean;
  url?: string;
  error?: string;
}

async function uploadToBlob(userId: string, buf: Buffer, mime: string): Promise<string> {
  const ext = /jpe?g/.test(mime) ? 'jpg' : /webp/.test(mime) ? 'webp' : 'png';
  const blob = await put(`ai-images/${userId}/${Date.now()}.${ext}`, buf, {
    access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, contentType: mime, addRandomSuffix: true,
  });
  return blob.url;
}

/** Cloudflare Workers AI (FLUX.1-schnell, 무료 티어). CF_ACCOUNT_ID + CF_AI_TOKEN 필요. */
async function tryCloudflare(userId: string, prompt: string): Promise<HostedImageResult | null> {
  const acct = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_AI_TOKEN;
  if (!acct || !token) return null;
  try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, steps: 4 }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) {
      const b = (await r.text()).slice(0, 200).replace(/\s+/g, ' ');
      return { ok: false, error: `Cloudflare ${r.status}: ${b.slice(0, 130)}` };
    }
    const j = await r.json();
    const b64 = j?.result?.image;
    if (!b64) return { ok: false, error: 'Cloudflare 이미지 응답 없음' };
    const buf = Buffer.from(b64, 'base64');
    return { ok: true, url: await uploadToBlob(userId, buf, 'image/jpeg') };
  } catch (e: any) {
    return { ok: false, error: e?.name === 'TimeoutError' ? '이미지 생성 시간 초과 — 다시 시도하세요.' : (e?.message || 'Cloudflare 오류') };
  }
}

async function tryPollinations(userId: string, prompt: string, ratio: ImageRatio): Promise<HostedImageResult | null> {
  const token = process.env.POLLINATIONS_TOKEN;
  if (!token) return null;
  try {
    const url = `${buildPollinationsUrl(prompt, ratio)}&token=${encodeURIComponent(token)}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, redirect: 'follow', signal: AbortSignal.timeout(90000) });
    const ct = r.headers.get('content-type') || '';
    if (r.ok && ct.startsWith('image/')) {
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 1000) return { ok: true, url: await uploadToBlob(userId, buf, ct) };
    }
    return { ok: false, error: `이미지 생성 실패 (Pollinations ${r.status})` };
  } catch (e: any) {
    return { ok: false, error: e?.name === 'TimeoutError' ? '이미지 생성 시간 초과 — 다시 시도하세요.' : (e?.message || 'Pollinations 오류') };
  }
}

async function tryGemini(userId: string, prompt: string, ratio: ImageRatio): Promise<HostedImageResult | null> {
  const key = await getUserApiKey(userId, 'gemini');
  if (!key) return null;
  const text = `다음을 고품질 사진 이미지로 생성: ${prompt}. 비율 ${RATIO_HINT[ratio]}.`;
  let lastErr = '';
  for (const model of GEMINI_IMAGE_MODELS) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }),
        signal: AbortSignal.timeout(60000),
      });
      if (!r.ok) {
        const body = (await r.text()).slice(0, 200);
        if (/quota|RESOURCE_EXHAUSTED|\b429\b/i.test(body)) return { ok: false, error: 'Gemini 무료 사용량 초과 — 잠시 후 다시 시도하세요.' };
        lastErr = `${model} ${r.status}`;
        continue;
      }
      const data = await r.json();
      const img = (data?.candidates?.[0]?.content?.parts || []).find((x: any) => x?.inlineData?.data);
      if (!img) { lastErr = `${model} 이미지 없음`; continue; }
      const buf = Buffer.from(img.inlineData.data, 'base64');
      return { ok: true, url: await uploadToBlob(userId, buf, img.inlineData.mimeType || 'image/png') };
    } catch (e: any) {
      lastErr = e?.message || '오류';
    }
  }
  return { ok: false, error: `Gemini 이미지 불가 (${lastErr})` };
}

/** 이미지 생성 → Blob 공개 URL. */
export async function generateImageHosted(userId: string, prompt: string, ratio: ImageRatio = 'square'): Promise<HostedImageResult> {
  const p = (prompt || '').trim();
  if (!p) return { ok: false, error: '이미지 설명을 입력하세요' };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ok: false, error: '이미지 저장소(Blob)가 설정되지 않았습니다.' };

  const cf = await tryCloudflare(userId, p);
  if (cf?.ok) return cf;
  const pol = await tryPollinations(userId, p, ratio);
  if (pol?.ok) return pol;
  const gem = await tryGemini(userId, p, ratio);
  if (gem?.ok) return gem;

  // 전부 실패 — 가장 의미있는 에러 반환
  return cf || pol || gem || { ok: false, error: 'AI 이미지 생성이 아직 설정되지 않았어요. 지금은 사진 직접 업로드를 사용하세요.' };
}
