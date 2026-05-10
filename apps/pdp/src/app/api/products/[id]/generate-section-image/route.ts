/**
 * POST /api/products/[id]/generate-section-image
 *
 * Phase 3.2 — 생성된 outline 의 특정 섹션 이미지를 FLUX 1.1 Pro 로 생성.
 *
 * Body:
 *   - sectionIdx:   number (Product.metadata.generatedPage.sections 의 index)
 *   - imagePrompt?: string (override — 사용자가 prompt 수정한 경우)
 *
 * 동작:
 *   1) Product 조회 → metadata.generatedPage 확인
 *   2) sections[sectionIdx] 존재 + imagePrompt 있는지 확인
 *   3) credits 차감 (20)
 *   4) FLUX 1.1 Pro 호출
 *   5) R2 업로드
 *   6) OutputImage(mode='ai_generate') 저장 + Product.metadata.generatedPage.sections[idx].generatedImageUrl 업데이트
 *
 * 비용: 20 credits / 섹션
 *
 * Note: 한 번에 모든 섹션 batch 처리는 user 가 outline 검토 후 원하는 섹션만 생성해야 비용 효율적이라 단일 섹션만 지원.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateSectionImage } from '@/lib/pipeline/generate-section-image';
import { uploadToR2, isR2Configured } from '@/lib/storage/r2';
import { spendCredits, addCredits } from '@/lib/credit';
import type { GeneratedPageOutline, PageSection, SectionType } from '@/lib/pipeline/generate-outline';

export const maxDuration = 120;

const SECTION_IMAGE_COST = 20;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    if (!isR2Configured()) {
        return NextResponse.json(
            { error: 'R2 storage 가 설정되지 않았습니다 — env 변수 확인' },
            { status: 500 },
        );
    }

    const body = await req.json().catch(() => ({}));
    const sectionIdx = Number(body?.sectionIdx);
    const imagePromptOverride: string | undefined = body?.imagePrompt;

    if (!Number.isInteger(sectionIdx) || sectionIdx < 0) {
        return NextResponse.json({ error: 'sectionIdx 가 잘못됨' }, { status: 400 });
    }

    const { id } = await ctx.params;
    const product = await prisma.product.findFirst({ where: { id, userId } });
    if (!product) return NextResponse.json({ error: 'Product 없음' }, { status: 404 });

    const meta = (product.metadata as any) || {};
    const outline = meta.generatedPage as GeneratedPageOutline | undefined;
    if (!outline || !Array.isArray(outline.sections)) {
        return NextResponse.json({ error: '먼저 outline 을 생성하세요' }, { status: 400 });
    }
    const section: PageSection | undefined = outline.sections[sectionIdx];
    if (!section) {
        return NextResponse.json({ error: `sectionIdx ${sectionIdx} 가 outline 범위 밖` }, { status: 400 });
    }

    const imagePrompt = (imagePromptOverride || section.imagePrompt || '').trim();
    if (!imagePrompt) {
        return NextResponse.json({ error: '이 섹션은 imagePrompt 가 없습니다 (텍스트 only 섹션)' }, { status: 400 });
    }

    // credits 차감
    const spend = await spendCredits(userId, {
        amount: SECTION_IMAGE_COST,
        bot: 'pdpbot',
        action: 'IMAGE_GEN',
        refType: 'Product',
        refId: product.id,
        metadata: { phase: '3.2', sectionIdx, sectionType: section.type },
    });
    if (!spend.ok) {
        return NextResponse.json({ error: spend.error || '잔액 부족' }, { status: 402 });
    }

    try {
        const { buffer, width, height, modelUsed } = await generateSectionImage({
            sectionType: section.type as SectionType,
            imagePrompt,
        });

        // R2 업로드
        const key = `pdp/${userId}/${product.id}/section-${sectionIdx}-${Date.now()}.png`;
        const r2Url = await uploadToR2(key, buffer, 'image/png');

        // OutputImage 저장 (mode='ai_generate')
        const output = await prisma.outputImage.create({
            data: {
                productId: product.id,
                sourceImageId: null,
                r2Url,
                width,
                height,
                mode: 'ai_generate',
                creditsUsed: SECTION_IMAGE_COST,
                metadata: {
                    phase: '3.2',
                    sectionIdx,
                    sectionType: section.type,
                    imagePrompt,
                    modelUsed,
                } as any,
            },
        });

        // Product.metadata.generatedPage.sections[idx] 에 이미지 URL 추가
        const updatedSections = outline.sections.map((s, i) =>
            i === sectionIdx
                ? { ...s, generatedImageUrl: r2Url, generatedImageOutputId: output.id, imagePrompt }
                : s,
        );
        await prisma.product.update({
            where: { id: product.id },
            data: {
                metadata: {
                    ...meta,
                    generatedPage: {
                        ...outline,
                        sections: updatedSections,
                    },
                } as any,
            },
        });

        return NextResponse.json({
            ok: true,
            outputImageId: output.id,
            r2Url,
            width,
            height,
            creditsUsed: SECTION_IMAGE_COST,
            balanceAfter: spend.balanceAfter,
        });
    } catch (e: any) {
        console.error('[/api/products/generate-section-image] error', e);
        // 실패 시 환불
        await addCredits(userId, SECTION_IMAGE_COST, 'pdpbot', 'REFUND', {
            reason: 'generate-section-image failed',
            sectionIdx,
            error: e?.message,
        }).catch(() => {});
        return NextResponse.json(
            { error: e?.message || '이미지 생성 실패 (credits 환불됨)' },
            { status: 500 },
        );
    }
}
