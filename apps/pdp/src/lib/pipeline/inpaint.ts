/**
 * 인페인팅 pipeline — 마스크 영역의 원본 글자를 자연스럽게 제거.
 *
 * 입력:
 *   - imageUrl: 원본 이미지 (public URL)
 *   - regions: detectTextRegions 결과 — 글자 위치들
 *
 * 처리:
 *   1) Sharp 로 마스크 PNG 생성 (검정 바탕 + 글자 위치를 흰색 — FLUX Fill 표준)
 *   2) Replicate FLUX 1.1 Pro Fill 호출 (이미지 + 마스크 → 인페인팅된 이미지)
 *   3) 결과 PNG buffer 반환
 *
 * 비용: $0.20 ~ $0.50 / 이미지 (해상도 + 마스크 면적에 따라).
 */

import sharp from 'sharp';
import { getReplicate, FLUX_FILL_MODEL } from '../ai/replicate';
import { replicateOutputToBuffer } from '../ai/replicate-output';
import type { DetectedRegion } from './ocr';

/**
 * 마스크 PNG 생성 — 같은 해상도, 검정 바탕 + region bbox 위치에 흰색 사각형.
 *
 * @param imageWidth  원본 이미지 width (px)
 * @param imageHeight 원본 이미지 height (px)
 * @param regions     탐지된 텍스트 영역 (0~1 비율)
 * @returns PNG buffer
 */
export async function buildMaskPng(
    imageWidth: number,
    imageHeight: number,
    regions: DetectedRegion[],
): Promise<Buffer> {
    // SVG 로 마스크 그리기 → PNG 변환 (Sharp pattern)
    const rects = regions
        .map(r => {
            const x = Math.floor(r.bboxX * imageWidth);
            const y = Math.floor(r.bboxY * imageHeight);
            const w = Math.ceil(r.bboxW * imageWidth);
            const h = Math.ceil(r.bboxH * imageHeight);
            return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" />`;
        })
        .join('');

    const svg = `<svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${imageWidth}" height="${imageHeight}" fill="black" />
        ${rects}
    </svg>`;

    return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Replicate FLUX 1.1 Pro Fill 로 인페인팅 실행.
 * 입력: imageUrl + maskUrl (둘 다 public URL — R2 등에 미리 업로드 후 호출).
 *
 * @returns 인페인팅된 이미지 PNG buffer (Replicate URL/stream/FileOutput 모두 처리).
 */
export async function runInpaint(opts: {
    imageUrl: string;
    maskUrl: string;
    /** 인페인팅 prompt — 'remove text, restore background' 같은 지시. */
    prompt?: string;
    /** BYOK — 사용자 Replicate token. */
    userReplicateKey?: string | null;
}): Promise<Buffer> {
    const replicate = getReplicate(opts.userReplicateKey);
    const prompt = opts.prompt
        || 'Remove all text and restore the original background seamlessly. Match surrounding colors, textures, lighting and style. No text should remain.';

    const output = await replicate.run(FLUX_FILL_MODEL, {
        input: {
            image: opts.imageUrl,
            mask: opts.maskUrl,
            prompt,
            output_format: 'png',
            output_quality: 95,
            steps: 50,
        },
    } as any);

    return replicateOutputToBuffer(output);
}
