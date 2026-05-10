/**
 * POST /api/products/[id]/analyze
 *
 * Claude Vision 으로 상품 자동 분석 — 카테고리, 특징, 타겟, 마케팅 훅, 키워드.
 * 결과를 Product.metadata 에 저장 + 반환.
 *
 * 비용: 10 credits (IMAGE_GEN 단가 재사용 — Claude Opus image input).
 *
 * Body: 없음 (productId 는 URL).
 *
 * 동일 상품이라도 재분석 가능 — 매번 Claude 호출 + credits 차감.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { analyzeProduct } from '@/lib/pipeline/analyze';
import { spendCredits, CREDIT_RATES } from '@/lib/credit';
import { resolveByokForAction, computeByokAdjustedCost } from '@/lib/byok-cost';

export const maxDuration = 60;

const ANALYZE_COST = 10; // credits — Claude Opus image input 한 번

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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

    // 분석에 사용할 이미지 — 처리된 결과 (한국어 합성) 가 있으면 그것, 아니면 원본.
    const imageUrl = product.outputImages[0]?.r2Url
        || product.images[0]?.r2Url
        || product.images[0]?.sourceUrl;
    if (!imageUrl) {
        return NextResponse.json({ error: '분석할 이미지가 없습니다 — 먼저 이미지 추출 + 처리하세요' }, { status: 400 });
    }

    // BYOK 체크 — 사용자가 Anthropic 키 입력했으면 운영자 키 대신 사용 + credit 0
    const { byok, userKey } = await resolveByokForAction(userId, 'ANALYZE');
    const adjustedCost = computeByokAdjustedCost(ANALYZE_COST, byok);

    // credits 차감 (BYOK 면 0)
    const spend = await spendCredits(userId, {
        amount: adjustedCost,
        bot: 'pdpbot',
        action: 'IMAGE_GEN', // 'ANALYZE' action 추가는 schema 변경 필요 — 일단 IMAGE_GEN 재사용
        refType: 'Product',
        refId: product.id,
        metadata: { byok, kind: 'ANALYZE' },
    });
    if (!spend.ok) {
        return NextResponse.json({ error: spend.error || '잔액 부족' }, { status: 402 });
    }

    try {
        const analysis = await analyzeProduct({
            imageUrl,
            title: product.title || undefined,
            sourceSite: product.source,
            sourceUrl: product.sourceUrl,
            userAnthropicKey: userKey,
        });

        // Product.metadata 에 저장 (덮어씀 — 항상 최신만 유지)
        const existingMeta = (product.metadata as any) || {};
        await prisma.product.update({
            where: { id: product.id },
            data: {
                metadata: {
                    ...existingMeta,
                    analysis,
                    analyzedAt: new Date().toISOString(),
                } as any,
            },
        });

        return NextResponse.json({
            ok: true,
            analysis,
            creditsUsed: adjustedCost,
            byok,
            balanceAfter: spend.balanceAfter,
        });
    } catch (e: any) {
        console.error('[/api/products/analyze] error', e);
        // 실패 시 credit 환불 (Claude API fail 시 셀러 보호)
        const { addCredits } = await import('@/lib/credit');
        if (adjustedCost > 0) {
            await addCredits(userId, adjustedCost, 'pdpbot', 'REFUND', {
                reason: 'analyze failed',
                error: e?.message,
            }).catch(() => {});
        }

        return NextResponse.json(
            { error: e?.message || '분석 실패 (credits 환불됨)' },
            { status: 500 },
        );
    }
}
