/**
 * Phase 2.2 — FLUX 1.1 Pro 로 배경 이미지 생성.
 *
 * Claude 가 layout 을 만들기 전에 prompt 기반으로 배경 이미지 미리 생성 → URL 을 Claude 에 같이 전달.
 * Claude 가 그 위에 텍스트/도형 layout 결정.
 *
 * 비용: 20 credits / 이미지 (FLUX 단가).
 *
 * 캔버스 비율에 맞는 aspect_ratio 자동 선택.
 */

import sharp from 'sharp';
import { getReplicate, FLUX_PRO_MODEL } from '../ai/replicate';
import { replicateOutputToBuffer } from '../ai/replicate-output';

interface GenerateBgInput {
    /** 디자인 prompt — '봄 화장품 광고' 등. FLUX 용 영문 prompt 로 확장됨. */
    userPrompt: string;
    canvasWidth: number;
    canvasHeight: number;
    userReplicateKey?: string | null;
}

function pickAspectRatio(w: number, h: number): '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' {
    const r = w / h;
    if (Math.abs(r - 1) < 0.05) return '1:1';
    if (Math.abs(r - 4/3) < 0.05) return '4:3';
    if (Math.abs(r - 3/4) < 0.05) return '3:4';
    if (Math.abs(r - 16/9) < 0.05) return '16:9';
    if (Math.abs(r - 9/16) < 0.05) return '9:16';
    if (r > 1) return r > 1.4 ? '16:9' : '3:2';
    return r < 0.7 ? '9:16' : '2:3';
}

export async function generateBackgroundImage(opts: GenerateBgInput): Promise<{
    buffer: Buffer; width: number; height: number;
}> {
    const replicate = getReplicate(opts.userReplicateKey);
    const aspect = pickAspectRatio(opts.canvasWidth, opts.canvasHeight);

    const enrichedPrompt = [
        opts.userPrompt,
        'background image for product advertisement, clean composition, no text, no watermark,',
        'high resolution, professional photography or graphic design, well-lit',
    ].join(', ');

    const output = await replicate.run(FLUX_PRO_MODEL, {
        input: {
            prompt: enrichedPrompt,
            aspect_ratio: aspect,
            output_format: 'png',
            output_quality: 95,
            safety_tolerance: 2,
            prompt_upsampling: true,
        },
    } as any);

    const rawBuffer = await replicateOutputToBuffer(output);

    // 캔버스 정확한 크기로 resize (cover)
    const resized = await sharp(rawBuffer)
        .resize(opts.canvasWidth, opts.canvasHeight, { fit: 'cover', position: 'center' })
        .png({ quality: 95 })
        .toBuffer();

    return { buffer: resized, width: opts.canvasWidth, height: opts.canvasHeight };
}
