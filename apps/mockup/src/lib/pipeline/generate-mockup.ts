/**
 * FLUX Kontext Pro — 상품 이미지를 목업 컨텍스트에 합성.
 * 입력: productImageUrl + mockupType + customPrompt
 * 출력: 목업 이미지 Buffer
 * 비용: ~30 credits
 */

import Replicate from 'replicate';

export const MOCKUP_CONTEXTS: Record<string, { label: string; prompt: string; aspectRatio: string }> = {
    tshirt: {
        label: '티셔츠',
        prompt: 'Professional product mockup. The product from the reference image is printed/displayed on a white flat-lay t-shirt. Clean studio background. Commercial product photography.',
        aspectRatio: '1:1',
    },
    hoodie: {
        label: '후드티',
        prompt: 'Professional product mockup. The product from the reference image is displayed on a hoodie flat-lay. Neutral background. High quality commercial photography.',
        aspectRatio: '1:1',
    },
    mug: {
        label: '머그컵',
        prompt: 'Professional product mockup. The product branding/design from the reference image is on a white ceramic mug. Warm cafe background. Commercial photography.',
        aspectRatio: '4:3',
    },
    poster: {
        label: '포스터',
        prompt: 'Professional product photography. The product from the reference image displayed as a framed poster on a modern wall. Interior design background.',
        aspectRatio: '3:4',
    },
    billboard: {
        label: '빌보드 광고',
        prompt: 'Professional advertising mockup. The product from the reference image shown on a large outdoor billboard in an urban city scene. Realistic lighting.',
        aspectRatio: '16:9',
    },
    tote: {
        label: '토트백',
        prompt: 'Professional product mockup. The product design from the reference image printed on a natural cotton tote bag. Clean background. Commercial photography.',
        aspectRatio: '3:4',
    },
    phone_case: {
        label: '폰케이스',
        prompt: 'Professional product mockup. The product design from the reference image on an iPhone phone case. Clean white background. Product photography.',
        aspectRatio: '3:4',
    },
    frame: {
        label: '액자',
        prompt: 'Professional interior mockup. The product image from the reference image displayed in a modern wooden picture frame on a wall. Lifestyle home interior.',
        aspectRatio: '4:3',
    },
};

export async function generateMockup(opts: {
    productImageUrl: string;
    mockupType: string;
    customPrompt?: string;
    userReplicateKey?: string | null;
}): Promise<{ buffer: Buffer; contentType: string }> {
    const ctx = MOCKUP_CONTEXTS[opts.mockupType] || MOCKUP_CONTEXTS.tshirt;
    const prompt = opts.customPrompt
        ? `${ctx.prompt} Additional context: ${opts.customPrompt}`
        : ctx.prompt;

    const apiToken = opts.userReplicateKey || process.env.REPLICATE_API_TOKEN;
    if (!apiToken) throw new Error('REPLICATE_API_TOKEN 환경변수가 없습니다');

    const replicate = new Replicate({ auth: apiToken });

    // FLUX Kontext Pro: takes reference image + prompt, generates edited version
    const output = await replicate.run('black-forest-labs/flux-kontext-pro', {
        input: {
            prompt,
            input_image: opts.productImageUrl,
            aspect_ratio: ctx.aspectRatio,
            output_format: 'png',
            safety_tolerance: 2,
        },
    });

    // Handle various output formats
    const { resolveReplicateOutput } = await import('../ai/replicate-output');
    const buffer = await resolveReplicateOutput(output);
    return { buffer, contentType: 'image/png' };
}
