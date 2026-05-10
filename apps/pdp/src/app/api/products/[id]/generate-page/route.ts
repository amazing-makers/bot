/**
 * POST /api/products/[id]/generate-page
 *
 * Phase 3.1 — 상품 분석 결과 기반으로 신규 상세페이지 outline 자동 생성.
 *
 * 전제: Product.metadata.analysis 가 있어야 함. 없으면 자동 analyze (10 + 5 credits).
 *
 * Body: { userBrief?: string }
 *
 * 비용: 5 credits + (auto-analyze 시 10). BYOK Anthropic 시 모두 0.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateOutline } from '@/lib/pipeline/generate-outline';
import { analyzeProduct } from '@/lib/pipeline/analyze';
import { withCreditRefund } from '@/lib/credit';

export const maxDuration = 90;

const OUTLINE_COST = 5;
const ANALYZE_COST = 10;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const userBrief: string | undefined = body?.userBrief ? String(body.userBrief) : undefined;

    const product = await prisma.product.findFirst({
        where: { id, userId },
        include: {
            images: { take: 1, orderBy: { orderIdx: 'asc' } },
            outputImages: { take: 1, orderBy: { createdAt: 'asc' } },
        },
    });
    if (!product) return NextResponse.json({ error: 'Product 없음' }, { status: 404 });

    let analysis = (product.metadata as any)?.analysis;
    let autoAnalyzeCreditsUsed = 0;
    let autoAnalyzeByok = false;

    try {
        // Step 0: analysis 없으면 자동 분석 (withCreditRefund 로 감싸 spend+refund 자동)
        if (!analysis) {
            const imageUrl = product.outputImages[0]?.r2Url
                || product.images[0]?.r2Url
                || product.images[0]?.sourceUrl;
            if (!imageUrl) {
                return NextResponse.json({ error: '분석할 이미지가 없습니다' }, { status: 400 });
            }

            const analyzeGuarded = await withCreditRefund(
                userId,
                {
                    action: 'ANALYZE',
                    baseCost: ANALYZE_COST,
                    bot: 'pdpbot',
                    refType: 'Product',
                    refId: product.id,
                    metadata: { auto: true, parentAction: 'generate-page' },
                },
                async ({ userKey }) => {
                    const a = await analyzeProduct({
                        imageUrl,
                        title: product.title || undefined,
                        sourceSite: product.source,
                        sourceUrl: product.sourceUrl,
                        userAnthropicKey: userKey,
                    });
                    await prisma.product.update({
                        where: { id: product.id },
                        data: {
                            metadata: {
                                ...(product.metadata as any),
                                analysis: a,
                                analyzedAt: new Date().toISOString(),
                            } as any,
                        },
                    });
                    return a;
                },
            );
            analysis = analyzeGuarded.result;
            autoAnalyzeCreditsUsed = analyzeGuarded.creditsUsed;
            autoAnalyzeByok = analyzeGuarded.byok;
        }

        // Step 1: outline 생성
        const outlineGuarded = await withCreditRefund(
            userId,
            {
                action: 'OUTLINE',
                baseCost: OUTLINE_COST,
                bot: 'pdpbot',
                refType: 'Product',
                refId: product.id,
                metadata: { kind: 'outline' },
            },
            async ({ userKey }) => {
                const outline = await generateOutline({
                    title: product.title || undefined,
                    analysis,
                    userBrief,
                    userAnthropicKey: userKey,
                });
                await prisma.product.update({
                    where: { id: product.id },
                    data: {
                        metadata: {
                            ...(product.metadata as any),
                            generatedPage: outline,
                            generatedPageAt: new Date().toISOString(),
                            generatedPageBrief: userBrief,
                        } as any,
                    },
                });
                return outline;
            },
        );

        return NextResponse.json({
            ok: true,
            outline: outlineGuarded.result,
            analysis,
            creditsUsed: outlineGuarded.creditsUsed + autoAnalyzeCreditsUsed,
            byok: outlineGuarded.byok || autoAnalyzeByok,
            balanceAfter: outlineGuarded.balanceAfter,
        });
    } catch (e: any) {
        console.error('[/api/products/generate-page] error', e);
        return NextResponse.json(
            { error: e?.message || 'outline 생성 실패' },
            { status: e?.status === 402 ? 402 : 500 },
        );
    }
}
