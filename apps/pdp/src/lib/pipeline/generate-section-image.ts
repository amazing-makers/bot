/**
 * 섹션별 이미지 자동 생성 (Phase 3.2).
 *
 * GeneratedPageOutline 의 각 PageSection.imagePrompt 를 받아 FLUX 1.1 Pro 로 신규 이미지 생성.
 * 결과는 PNG buffer 로 반환 — 호출 측이 R2 에 업로드해 OutputImage(mode='ai_generate') 로 저장.
 *
 * 비용: ~20 credits / 이미지 (Replicate FLUX 1.1 Pro 단가).
 *
 * 섹션 type 별 이미지 권장 비율:
 *   - hero       : 1080×1080 (정사각형, 모바일 대형 비주얼)
 *   - feature_*  : 1080×720  (가로형 — 특징 옆에 텍스트 공간)
 *   - comparison : 1080×720
 *   - usage      : 1080×1080
 *   - social_proof: 1080×720
 *   - cta        : 1080×600  (낮은 높이, 마지막 CTA 위)
 */

import sharp from 'sharp';
import { getReplicate, FLUX_PRO_MODEL } from '../ai/replicate';
import { replicateOutputToBuffer } from '../ai/replicate-output';
import type { SectionType } from './generate-outline';

interface SectionImageSize {
    width: number;
    height: number;
    /** Replicate FLUX 의 aspect_ratio 파라미터 (지원: 1:1, 16:9, 4:3, 3:4, 9:16 등). */
    aspectRatio: '1:1' | '16:9' | '4:3' | '3:4' | '9:16' | '3:2';
}

const SECTION_SIZES: Record<SectionType, SectionImageSize> = {
    hero:         { width: 1080, height: 1080, aspectRatio: '1:1' },
    feature_list: { width: 1080, height: 720,  aspectRatio: '3:2' },
    comparison:   { width: 1080, height: 720,  aspectRatio: '3:2' },
    usage:        { width: 1080, height: 1080, aspectRatio: '1:1' },
    social_proof: { width: 1080, height: 720,  aspectRatio: '3:2' },
    cta:          { width: 1080, height: 600,  aspectRatio: '16:9' },
};

/**
 * FLUX 1.1 Pro 호출 — 단일 섹션 이미지 생성.
 *
 * @returns 생성된 이미지 PNG buffer (1080px 폭으로 normalize)
 */
export async function generateSectionImage(opts: {
    sectionType: SectionType;
    imagePrompt: string;
    /** 강화 prompt — 한국 모바일 상세페이지 스타일로 일관된 톤. */
    extraPromptSuffix?: string;
    /** BYOK — 사용자 Replicate token. */
    userReplicateKey?: string | null;
}): Promise<{ buffer: Buffer; width: number; height: number; modelUsed: string }> {
    const replicate = getReplicate(opts.userReplicateKey);
    const size = SECTION_SIZES[opts.sectionType] || SECTION_SIZES.feature_list;

    // 한국 e-commerce 상세페이지 톤 — 깨끗한 배경, 자연광, 텍스트 없는 이미지 (텍스트는 합성 단계 Phase 3.3 에서 추가).
    const fullPrompt = [
        opts.imagePrompt,
        opts.extraPromptSuffix || 'professional product photography, clean composition, no text, no watermark, high resolution, e-commerce product detail page style',
    ].filter(Boolean).join(', ');

    const output = await replicate.run(FLUX_PRO_MODEL, {
        input: {
            prompt: fullPrompt,
            aspect_ratio: size.aspectRatio,
            output_format: 'png',
            output_quality: 95,
            safety_tolerance: 2, // 0(strict) ~ 6 — 2 가 일반 e-commerce 적정
            prompt_upsampling: true, // FLUX 가 prompt 자동 enrich
        },
    } as any);

    // URL/stream/FileOutput 모두 buffer 로 변환 (Replicate 응답 형식 다양)
    const rawBuffer = await replicateOutputToBuffer(output);

    // 1080px 폭 정규화 — 섹션 합성 (Phase 3.3) 시 일관성.
    const normalized = await sharp(rawBuffer)
        .resize(size.width, size.height, { fit: 'cover', position: 'center' })
        .png({ quality: 95 })
        .toBuffer();

    return {
        buffer: normalized,
        width: size.width,
        height: size.height,
        modelUsed: FLUX_PRO_MODEL,
    };
}
