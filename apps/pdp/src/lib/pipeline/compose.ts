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
            // 폰트 크기 자동 조정 — bbox height 70% 부터 시작, 텍스트가 너무 길면 줄임 (최소 10px).
            const safe = escapeXml(r.translatedText);
            const fontSize = computeFontSize(safe, bw - 8, bh);
            // 줄바꿈 — bbox width 안에서 한 줄당 글자 수 추정 + 다중 줄 가능
            const lines = wrapKoreanText(safe, bw - 8, fontSize);
            const lineHeight = fontSize * 1.15;
            // 첫 줄 baseline 위치 — bbox 상단 + ascender
            const startY = y + fontSize + 2;
            return lines.map((line, lineIdx) => {
                const ty = startY + lineIdx * lineHeight;
                return `<text x="${x + 4}" y="${ty}" font-family="Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif" font-size="${fontSize}" font-weight="700" fill="#222">${line}</text>`;
            }).join('\n');
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

/**
 * 한글 (전각) 1글자 ≈ 폰트 크기 1배 width 차지. 라틴 (반각) 0.5배 추정.
 * 정확한 측정은 어렵지만 통상적인 추정으로 충분.
 */
function estimateTextWidth(s: string, fontSize: number): number {
    let width = 0;
    for (const ch of s) {
        // 한글 / 한자 / 일본어 = 전각, 영문 / 숫자 / 공백 = 반각
        const isFullWidth = /[가-힯一-鿿぀-ヿ＀-￯]/.test(ch);
        width += fontSize * (isFullWidth ? 1.0 : 0.55);
    }
    return width;
}

/**
 * bbox 안에 텍스트가 잘 맞도록 폰트 크기 자동 조정.
 * 시작: bboxH * 0.7 (한 줄 가정).
 * 너무 길어 한 줄에 안 맞으면 단계적으로 줄임 (최소 10px).
 * bboxH 가 충분히 크면 다중 줄 wrap 으로 가능 (별도 함수가 처리) — 여기서는 한 줄 폰트 size 결정.
 */
function computeFontSize(text: string, maxWidth: number, maxHeight: number): number {
    let fontSize = Math.max(10, Math.floor(maxHeight * 0.7));
    // 한 줄 가정 width 가 maxWidth 의 80% 넘으면 — 줄바꿈 또는 폰트 축소.
    // 줄바꿈으로 처리하더라도 폰트 자체는 너무 크지 않게 cap.
    while (fontSize > 10 && estimateTextWidth(text, fontSize) > maxWidth * 2.5) {
        fontSize -= 1;
    }
    return fontSize;
}

/**
 * 한글 텍스트를 maxWidth 안에서 줄바꿈.
 * 단어 단위 (공백) 우선, 단어가 너무 길면 글자 단위.
 * bbox 가 짧아 1 줄에 안 맞으면 여러 줄 반환.
 */
function wrapKoreanText(text: string, maxWidth: number, fontSize: number): string[] {
    if (estimateTextWidth(text, fontSize) <= maxWidth) return [text];

    const lines: string[] = [];
    const words = text.split(/(\s+)/); // 공백 유지하면서 split
    let current = '';

    for (const word of words) {
        const candidate = current + word;
        if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
            current = candidate;
        } else {
            if (current) lines.push(current.trim());
            // 단어 자체가 길면 글자 단위 분할
            if (estimateTextWidth(word, fontSize) > maxWidth) {
                let chunk = '';
                for (const ch of word) {
                    if (estimateTextWidth(chunk + ch, fontSize) <= maxWidth) {
                        chunk += ch;
                    } else {
                        if (chunk) lines.push(chunk);
                        chunk = ch;
                    }
                }
                current = chunk;
            } else {
                current = word;
            }
        }
    }
    if (current.trim()) lines.push(current.trim());
    return lines.length > 0 ? lines : [text];
}
