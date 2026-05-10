/**
 * POST /api/products/[id]/compose-page
 *
 * Phase 3.3 — 생성된 outline + 섹션 이미지들 → 모바일 상세페이지 1장 PNG.
 *
 * 동작:
 *   1) Product.metadata.generatedPage 확인 (없으면 400)
 *   2) Sharp 로 모든 섹션을 위→아래로 composite
 *   3) R2 업로드 → OutputImage(mode='ai_generate', metadata.phase='3.3') 저장
 *   4) Product.metadata.composedPageUrl 갱신
 *
 * 비용: 1 credit (Sharp local 합성, R2 PUT 비용만).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { composeFullPage } from '@/lib/pipeline/compose-page';
import { uploadToR2, isR2Configured } from '@/lib/storage/r2';
import { spendCredits, addCredits } from '@/lib/credit';
import type { GeneratedPageOutline } from '@/lib/pipeline/generate-outline';

export const maxDuration = 90;

const COMPOSE_COST = 1;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    if (!isR2Configured()) {
        return NextResponse.json({ error: 'R2 storage 가 설정되지 않았습니다' }, { status: 500 });
    }

    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({ where: { id, userId } });
    if (!product) return NextResponse.json({ error: 'Product 없음' }, { status: 404 });

    const meta = (product.metadata as any) || {};
    const outline = meta.generatedPage as GeneratedPageOutline | undefined;
    if (!outline || !Array.isArray(outline.sections) || outline.sections.length === 0) {
        return NextResponse.json({ error: '먼저 outline 을 생성하세요' }, { status: 400 });
    }

    const spend = await spendCredits(userId, {
        amount: COMPOSE_COST,
        bot: 'pdpbot',
        action: 'COMPOSE',
        refType: 'Product',
        refId: product.id,
        metadata: { phase: '3.3', sectionsCount: outline.sections.length },
    });
    if (!spend.ok) {
        return NextResponse.json({ error: spend.error || '잔액 부족' }, { status: 402 });
    }

    try {
        const { buffer, width, height } = await composeFullPage(outline as any);

        const key = `pdp/${userId}/${product.id}/composed-page-${Date.now()}.png`;
        const r2Url = await uploadToR2(key, buffer, 'image/png');

        const output = await prisma.outputImage.create({
            data: {
                productId: product.id,
                sourceImageId: null,
                r2Url,
                width,
                height,
                mode: 'ai_generate',
                creditsUsed: COMPOSE_COST,
                metadata: {
                    phase: '3.3',
                    type: 'composed-page',
                    sectionsCount: outline.sections.length,
                } as any,
            },
        });

        await prisma.product.update({
            where: { id: product.id },
            data: {
                metadata: {
                    ...meta,
                    composedPageUrl: r2Url,
                    composedPageOutputId: output.id,
                    composedPageAt: new Date().toISOString(),
                } as any,
            },
        });

        return NextResponse.json({
            ok: true,
            outputImageId: output.id,
            r2Url,
            width,
            height,
            creditsUsed: COMPOSE_COST,
            balanceAfter: spend.balanceAfter,
        });
    } catch (e: any) {
        console.error('[/api/products/compose-page] error', e);
        await addCredits(userId, COMPOSE_COST, 'pdpbot', 'REFUND', {
            reason: 'compose-page failed',
            error: e?.message,
        }).catch(() => {});
        return NextResponse.json(
            { error: e?.message || '페이지 합성 실패 (credits 환불됨)' },
            { status: 500 },
        );
    }
}
