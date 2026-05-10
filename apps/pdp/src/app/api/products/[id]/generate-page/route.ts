/**
 * POST /api/products/[id]/generate-page
 *
 * Phase 3.1 — 상품 분석 결과 기반으로 신규 상세페이지 outline 자동 생성.
 *
 * 전제: Product.metadata.analysis 가 있어야 함 (없으면 먼저 /analyze 권장).
 *      없으면 자동으로 analyze 도 같이 (10 + 5 credits).
 *
 * Body: { userBrief?: string }  // 추가 요청 ('브랜드 톤 더 고급스럽게' 등)
 *
 * 비용: 5 credits (TRANSLATE 단가 재사용 — Claude Opus text only).
 *      analyze 도 자동 호출되면 +10 credits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateOutline } from '@/lib/pipeline/generate-outline';
import { analyzeProduct } from '@/lib/pipeline/analyze';
import { spendCredits, CREDIT_RATES } from '@/lib/credit';

export const maxDuration = 90;

const OUTLINE_COST = 5;
const ANALYZE_COST = 10; // auto-analyze 시

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;

    let userBrief: string | undefined;
    try {
        const body = await req.json().catch(() => ({}));
        userBrief = body?.userBrief ? String(body.userBrief) : undefined;
    } catch { /* body 없어도 OK */ }

    const product = await prisma.product.findFirst({
        where: { id, userId },
        include: {
            images: { take: 1, orderBy: { orderIdx: 'asc' } },
            outputImages: { take: 1, orderBy: { createdAt: 'asc' } },
        },
    });
    if (!product) return NextResponse.json({ error: 'Product 없음' }, { status: 404 });

    let analysis = (product.metadata as any)?.analysis;

    // Step 0: analysis 없으면 먼저 자동 분석
    if (!analysis) {
        const imageUrl = product.outputImages[0]?.r2Url
            || product.images[0]?.r2Url
            || product.images[0]?.sourceUrl;
        if (!imageUrl) {
            return NextResponse.json({ error: '분석할 이미지가 없습니다' }, { status: 400 });
        }

        const spend = await spendCredits(userId, {
            amount: ANALYZE_COST,
            bot: 'pdpbot',
            action: 'IMAGE_GEN',
            refType: 'Product',
            refId: product.id,
            metadata: { auto: true, parentAction: 'generate-page' },
        });
        if (!spend.ok) return NextResponse.json({ error: spend.error || '잔액 부족 (analyze)' }, { status: 402 });

        try {
            analysis = await analyzeProduct({
                imageUrl,
                title: product.title || undefined,
                sourceSite: product.source,
                sourceUrl: product.sourceUrl,
            });
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    metadata: {
                        ...(product.metadata as any),
                        analysis,
                        analyzedAt: new Date().toISOString(),
                    } as any,
                },
            });
        } catch (e: any) {
            const { addCredits } = await import('@/lib/credit');
            await addCredits(userId, ANALYZE_COST, 'pdpbot', 'REFUND', { reason: 'auto-analyze failed' }).catch(() => {});
            return NextResponse.json({ error: 'analyze 실패: ' + (e?.message || '') }, { status: 500 });
        }
    }

    // Step 1: outline 생성
    const spend = await spendCredits(userId, {
        amount: OUTLINE_COST,
        bot: 'pdpbot',
        action: 'TRANSLATE', // text-only Claude → TRANSLATE 단가 재사용
        refType: 'Product',
        refId: product.id,
        metadata: { kind: 'outline' },
    });
    if (!spend.ok) return NextResponse.json({ error: spend.error || '잔액 부족' }, { status: 402 });

    try {
        const outline = await generateOutline({
            title: product.title || undefined,
            analysis,
            userBrief,
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

        return NextResponse.json({
            ok: true,
            outline,
            analysis, // 자동 분석된 경우 같이 반환
            creditsUsed: OUTLINE_COST,
            balanceAfter: spend.balanceAfter,
        });
    } catch (e: any) {
        console.error('[/api/products/generate-page] error', e);
        const { addCredits } = await import('@/lib/credit');
        await addCredits(userId, OUTLINE_COST, 'pdpbot', 'REFUND', { reason: 'outline failed' }).catch(() => {});
        return NextResponse.json({ error: e?.message || 'outline 생성 실패' }, { status: 500 });
    }
}
