/**
 * 합성 pipeline — Sharp 로 인페인팅된 이미지에 번역 텍스트 SVG 오버레이.
 *
 * v1 (Phase 1.2):
 *   - 각 region bbox 위치에 번역 텍스트 그리기
 *   - 폰트: Pretendard (한글 + 라틴, 가변 weight) — public/fonts 에 미리 두기
 *   - bbox 영역에 맞도록 폰트 크기 자동 조정
 *   - 배경색은 인페인팅된 영역의 평균색 (선택)
 *
 * v2 (Phase 3+):
 *   - GPT-4 Vision 으로 원본 텍스트의 색상·폰트 weight·정렬 추정 후 같은 스타일로 합성
 *   - 다중 줄 텍스트 자동 wrap
 */

import sharp from 'sharp';
import type { DetectedRegion } from './ocr';

export interface ComposeRegion extends DetectedRegion {
    /** 번역된 한국어 또는 사용자 직접 입력 */
    translatedText: string;
}

/**
 * 인페인팅된 이미지 + region 들의 번역 텍스트 → 최종 PNG buffer.
 */
export async function composeWithTranslations(
    inpaintedBuffer: Buffer,
    regions: ComposeRegion[],
): Promise<Buffer> {
    const img = sharp(inpaintedBuffer);
    const meta = await img.metadata();
    const w = meta.width || 800;
    const h = meta.height || 800;

    // SVG 로 모든 텍스트를 한 번에 그리기 (Sharp.composite 효율 ↑)
    const textElements = regions
        .map(r => {
            const x = r.bboxX * w;
            const y = r.bboxY * h;
            const bw = r.bboxW * w;
            const bh = r.bboxH * h;
            // 폰트 크기 추정 — bbox height 의 70% (descender·ascender 고려)
            const fontSize = Math.max(10, Math.floor(bh * 0.7));
            // 텍스트는 bbox 좌상단 + 살짝 안쪽 (4px padding)
            const tx = x + 4;
            const ty = y + fontSize + 2; // baseline 위치
            // XML escape
            const safe = escapeXml(r.translatedText);
            return `<text x="${tx}" y="${ty}" font-family="Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-size="${fontSize}" font-weight="700" fill="#222" textLength="${Math.max(20, bw - 8)}" lengthAdjust="spacingAndGlyphs">${safe}</text>`;
        })
        .join('\n');

    const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${textElements}</svg>`;

    return img.composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
}

function escapeXml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
