/**
 * POST /api/designs/from-product
 *
 * pdpbot 에서 분석한 상품 정보를 시드로 designbot 디자인을 자동 생성.
 *
 * Body:
 *   - productId:    string   (pdpbot Product.id — 같은 Supabase DB 직접 조회)
 *   - canvasPreset: string   (CANVAS_PRESETS key, default: 'instagram_square')
 *   - brandKitId?:  string
 *   - adType?:      'instagram' | 'coupang' | 'naver' | 'story'
 *
 * 동작:
 *   1) Product + metadata.analysis 조회 (shared DB)
 *   2) analysis → 마케팅 카피 seed prompt 자동 빌드
 *   3) Design 레코드 생성 (sceneJson 빈 채)
 *   4) generateDesignScene 으로 scene 생성
 *   5) Design 업데이트 (sceneJson + sourceProductId)
 *   6) { designId, editorUrl } 반환
 *
 * 비용: 10 credits (layout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateDesignScene } from '@/lib/pipeline/generate-design';
import { withCreditRefund } from '@/lib/credit';
import { CANVAS_PRESETS } from '@/lib/design/types';

export const maxDuration = 90;

const LAYOUT_COST = 10;

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { productId, canvasPreset = 'instagram_square', brandKitId, adType } = body;

    if (!productId) {
        return NextResponse.json({ error: 'productId 필요' }, { status: 400 });
    }

    // 상품 조회 (같은 Supabase DB — Product 모델이 design schema 에 포함)
    const product = await (prisma as any).product.findFirst({
        where: { id: productId, userId },
        select: { id: true, title: true, price: true, source: true, metadata: true },
    });
    if (!product) {
        return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 });
    }

    // 캔버스 사이즈 결정
    const preset = CANVAS_PRESETS.find(p => p.key === canvasPreset) || CANVAS_PRESETS[0];

    // 분석 데이터 추출 — product.metadata.analysis (pdpbot Phase 2.1 결과)
    const analysis = (product.metadata as any)?.analysis;
    const prompt = buildPromptFromProduct(product, analysis, adType || guessAdType(canvasPreset));

    // BrandKit 자동 적용
    let brandColors: string[] | undefined;
    const kit = brandKitId
        ? await (prisma as any).brandKit.findFirst({ where: { id: brandKitId, userId } })
        : await (prisma as any).brandKit.findFirst({ where: { userId, isDefault: true } });
    if (kit?.colors?.length) brandColors = kit.colors;

    // Design 레코드 미리 생성 (empty scene)
    const emptyScene = { width: preset.width, height: preset.height, background: '#ffffff', elements: [] };
    const design = await (prisma as any).design.create({
        data: {
            userId,
            title: `${product.title || '상품'} — ${preset.label}`,
            canvasSize: preset.key,
            canvasWidth: preset.width,
            canvasHeight: preset.height,
            sceneJson: emptyScene,
            sourceProductId: productId,
            metadata: { sourceProductId: productId, adType: adType || guessAdType(canvasPreset), prompt },
        },
    });

    try {
        const layoutGuarded = await withCreditRefund(
            userId,
            {
                action: 'OUTLINE',
                baseCost: LAYOUT_COST,
                bot: 'designbot',
                refType: 'Design',
                refId: design.id,
                metadata: { kind: 'from_product', productId, canvasPreset, prompt },
            },
            async ({ userKey }) => {
                return await generateDesignScene({
                    prompt,
                    canvasWidth: preset.width,
                    canvasHeight: preset.height,
                    canvasFormat: preset.key,
                    brandColors,
                    userAnthropicKey: userKey,
                });
            },
        );

        const scene = layoutGuarded.result;

        await (prisma as any).design.update({
            where: { id: design.id },
            data: {
                sceneJson: scene as any,
                metadata: {
                    sourceProductId: productId,
                    adType: adType || guessAdType(canvasPreset),
                    prompt,
                    lastAiAt: new Date().toISOString(),
                },
            },
        });

        return NextResponse.json({
            ok: true,
            designId: design.id,
            editorUrl: `/editor/${design.id}`,
            creditsUsed: layoutGuarded.creditsUsed,
            byok: layoutGuarded.byok,
            balanceAfter: layoutGuarded.balanceAfter,
        });
    } catch (e: any) {
        // 실패 시 빈 design 레코드 삭제
        await (prisma as any).design.delete({ where: { id: design.id } }).catch(() => {});
        console.error('[/api/designs/from-product] error', e);
        return NextResponse.json(
            { error: e?.message || 'AI 디자인 생성 실패' },
            { status: e?.status === 402 ? 402 : 500 },
        );
    }
}

/** 광고 유형 → 캔버스 preset 연결. */
function guessAdType(preset: string): string {
    if (preset.includes('story')) return 'instagram_story';
    if (preset.includes('instagram')) return 'instagram';
    if (preset.includes('coupang')) return 'coupang';
    if (preset.includes('naver')) return 'naver';
    if (preset.includes('card')) return 'card_news';
    return 'sns';
}

/**
 * 상품 분석 결과 → AI 디자인 prompt 자동 빌드.
 *
 * analysis 구조 (pdpbot generate-page.ts 기준):
 *   { hooks: string[], features: string[], benefits: string[], targetAudience?: string,
 *     keyMessages?: string[], tone?: string, productCategory?: string }
 */
function buildPromptFromProduct(
    product: { title?: string | null; price?: string | null; source: string },
    analysis: any,
    adType: string,
): string {
    const parts: string[] = [];

    // 상품명
    const title = product.title?.trim() || '상품';
    parts.push(`상품명: ${title}`);

    // 가격
    if (product.price) parts.push(`가격: ${product.price}`);

    // 소스
    const sourceLabel: Record<string, string> = {
        coupang: '쿠팡',
        naver: '네이버 스마트스토어',
        taobao: '타오바오',
        '1688': '1688',
        amazon: '아마존',
    };
    parts.push(`플랫폼: ${sourceLabel[product.source] || product.source}`);

    // 광고 유형
    const adTypeLabels: Record<string, string> = {
        instagram: '인스타그램 피드 광고',
        instagram_story: '인스타그램 스토리 광고',
        coupang: '쿠팡 상품 대표 이미지',
        naver: '네이버 스마트스토어 배너',
        card_news: '인스타그램 카드뉴스',
        sns: 'SNS 광고 배너',
    };
    parts.push(`광고 유형: ${adTypeLabels[adType] || adType}`);

    if (analysis) {
        // 핵심 메시지 / hooks
        const hooks: string[] = analysis.hooks || analysis.keyMessages || [];
        if (hooks.length) {
            parts.push(`핵심 마케팅 메시지 (헤드라인으로 활용):\n${hooks.slice(0, 3).map((h: string) => `  - ${h}`).join('\n')}`);
        }

        // 주요 특징
        const features: string[] = analysis.features || [];
        if (features.length) {
            parts.push(`주요 특징:\n${features.slice(0, 3).map((f: string) => `  - ${f}`).join('\n')}`);
        }

        // 타겟 오디언스
        if (analysis.targetAudience) {
            parts.push(`타겟: ${analysis.targetAudience}`);
        }

        // 톤
        if (analysis.tone) {
            parts.push(`톤: ${analysis.tone}`);
        }

        // 카테고리
        if (analysis.productCategory) {
            parts.push(`카테고리: ${analysis.productCategory}`);
        }
    }

    parts.push('');
    parts.push('위 상품 정보를 바탕으로 임팩트 있는 한국어 마케팅 디자인을 생성해줘.');
    parts.push('헤드라인은 핵심 메시지에서 가장 강력한 것으로, CTA 버튼 포함.');

    return parts.join('\n');
}
