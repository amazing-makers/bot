/**
 * POST /api/products/[id]/analyze
 *
 * Claude Vision 으로 상품 자동 분석 — 카테고리, 특징, 타겟, 마케팅 훅, 키워드.
 * 결과를 Product.metadata 에 저장 + 반환.
 *
 * 비용: 10 credits (IMAGE_GEN 단가 재사용 — Claude Opus image input). BYOK Anthropic 시 0.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { analyzeProduct } from '@/lib/pipeline/analyze';
import { withCreditRefund } from '@/lib/credit';

export const maxDuration = 60;

const ANALYZE_COST = 10;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({
        where: { id, userId },
        include: {
            images: { take: 1, orderBy: { orderIdx: 'asc' } },
            outputImages: { take: 1, orderBy: { createdAt: 'asc' } },
        },
    });
    if (!product) return NextResponse.json({ error: 'Product 없음' }, { status: 404 });

    const imageUrl = product.outputImages[0]?.r2Url
        || product.images[0]?.r2Url
        || product.images[0]?.sourceUrl;
    if (!imageUrl) {
        return NextResponse.json({ error: '분석할 이미지가 없습니다 — 먼저 이미지 추출 + 처리하세요' }, { status: 400 });
    }

    try {
        const guarded = await withCreditRefund(
            userId,
            { action: 'ANALYZE', baseCost: ANALYZE_COST, bot: 'pdpbot', refType: 'Product', refId: product.id },
            async ({ userKey }) => {
                const analysis = await analyzeProduct({
                    imageUrl,
                    title: product.title || undefined,
                    sourceSite: product.source,
                    sourceUrl: product.sourceUrl,
                    userAnthropicKey: userKey,
                });
                const existingMeta = (product.metadata as any) || {};
                await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        metadata: { ...existingMeta, analysis, analyzedAt: new Date().toISOString() } as any,
                    },
                });
                return analysis;
            },
        );

        return NextResponse.json({
            ok: true,
            analysis: guarded.result,
            creditsUsed: guarded.creditsUsed,
            byok: guarded.byok,
            balanceAfter: guarded.balanceAfter,
        });
    } catch (e: any) {
        console.error('[/api/products/analyze] error', e);
        return NextResponse.json(
            { error: e?.message || '분석 실패' },
            { status: e?.status === 402 ? 402 : 500 },
        );
    }
}
