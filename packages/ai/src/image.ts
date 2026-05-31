/**
 * @amakers/ai — AI 이미지 생성 (Pollinations 무료, API 키 불필요). 전 봇/허브 공용.
 * prompt → 공개 https 이미지 URL. on-demand 라 pre-warm(GET)으로 CDN 캐시 올림.
 */

export type ImageRatio = 'square' | 'portrait' | 'story' | 'landscape';

const RATIO_SIZE: Record<ImageRatio, { width: number; height: number; label: string }> = {
  square: { width: 1080, height: 1080, label: '1:1 정사각형' },
  portrait: { width: 1080, height: 1350, label: '4:5 세로' },
  story: { width: 1080, height: 1920, label: '9:16 스토리' },
  landscape: { width: 1280, height: 720, label: '16:9 가로(대표)' },
};

export const IMAGE_RATIOS = (Object.keys(RATIO_SIZE) as ImageRatio[]).map((value) => ({ value, label: RATIO_SIZE[value].label }));

export function buildPollinationsUrl(prompt: string, ratio: ImageRatio = 'square'): string {
  const { width, height } = RATIO_SIZE[ratio];
  const seed = Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
}

export interface GenerateImageResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** 프롬프트 → Pollinations 공개 이미지 URL (pre-warm 포함). */
export async function generateImage(prompt: string, ratio: ImageRatio = 'square'): Promise<GenerateImageResult> {
  const p = prompt.trim();
  if (!p) return { ok: false, error: '이미지 설명(프롬프트)을 입력하세요' };

  const url = buildPollinationsUrl(p, ratio);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120000) });
    if (!r.ok) return { ok: false, error: `이미지 생성 실패 (Pollinations ${r.status})` };
    const len = Number(r.headers.get('content-length') || '0');
    if (len && len < 1000) return { ok: false, error: '이미지 응답이 비정상입니다 — 다시 시도하세요' };
    await r.arrayBuffer().catch(() => null);
    return { ok: true, url };
  } catch (e: any) {
    return { ok: false, error: e?.name === 'TimeoutError' ? '이미지 생성 시간 초과 — 다시 시도하세요' : (e?.message || '이미지 생성 오류') };
  }
}
