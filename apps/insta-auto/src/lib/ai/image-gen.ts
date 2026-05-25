/**
 * AI 이미지 생성 — Pollinations (무료, API 키 불필요).
 *
 * Pollinations.ai 는 prompt 를 URL 에 넣으면 공개 https 이미지를 반환한다.
 * 이 URL 은 **그대로 인스타 Graph API 의 image_url 로 사용 가능** (public https).
 * → R2/S3 업로드 없이도 AI 이미지를 바로 발행할 수 있음.
 *
 * 신뢰성: 생성은 on-demand 라 첫 요청이 느릴 수 있어, 서버에서 한 번 pre-warm(GET)해
 *         CDN 캐시에 올린 뒤 URL 을 반환 → 이후 인스타 서버의 fetch 가 빠르고 안정적.
 */

export type ImageRatio = 'square' | 'portrait' | 'story' | 'landscape';

const RATIO_SIZE: Record<ImageRatio, { width: number; height: number; label: string }> = {
    square: { width: 1080, height: 1080, label: '1:1 정사각형' },
    portrait: { width: 1080, height: 1350, label: '4:5 세로 (피드 추천)' },
    story: { width: 1080, height: 1920, label: '9:16 스토리/릴스' },
    landscape: { width: 1080, height: 566, label: '1.91:1 가로' },
};

export const IMAGE_RATIOS = (Object.keys(RATIO_SIZE) as ImageRatio[]).map((value) => ({
    value,
    label: RATIO_SIZE[value].label,
}));

export function buildPollinationsUrl(prompt: string, ratio: ImageRatio = 'square'): string {
    const { width, height } = RATIO_SIZE[ratio];
    const seed = Math.floor(Math.random() * 1_000_000); // 매번 다른 결과
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
}

export interface GenerateImageResult {
    ok: boolean;
    url?: string;
    error?: string;
}

/** 프롬프트 → Pollinations 공개 이미지 URL (pre-warm 포함). */
export async function generateInstagramImage(prompt: string, ratio: ImageRatio = 'square'): Promise<GenerateImageResult> {
    const p = prompt.trim();
    if (!p) return { ok: false, error: '이미지 설명(프롬프트)을 입력하세요' };

    const url = buildPollinationsUrl(p, ratio);
    try {
        // pre-warm: 생성/캐시 트리거 (실패해도 URL 은 유효 — 인스타가 다시 fetch)
        const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120000) });
        if (!r.ok) return { ok: false, error: `이미지 생성 실패 (Pollinations ${r.status})` };
        const len = Number(r.headers.get('content-length') || '0');
        if (len && len < 1000) return { ok: false, error: '이미지 응답이 비정상입니다 — 다시 시도하세요' };
        // 본문은 버림 (URL 만 사용). 스트림 닫기.
        await r.arrayBuffer().catch(() => null);
        return { ok: true, url };
    } catch (e: any) {
        return { ok: false, error: e?.name === 'TimeoutError' ? '이미지 생성 시간 초과 — 다시 시도하세요' : (e?.message || '이미지 생성 오류') };
    }
}
