/**
 * POST /api/scraped-images/[id]/recompose
 *
 * 사용자가 번역 텍스트를 직접 수정한 뒤 재합성. 인페인팅은 이미 완료된 결과 (inpaintedR2Url) 재사용 →
 * 비싼 FLUX 호출 skip + COMPOSE 만 (1 credit).
 *
 * Body:
 *   { regionUserOverrides: Record<textRegionId, newText> }
 *
 * 처리:
 *   1) ScrapedImage + 최신 OutputImage 의 inpaintedR2Url 조회
 *   2) TextRegion 의 userOverride 갱신 (DB)
 *   3) inpainted 이미지 fetch + 새 텍스트로 합성
 *   4) 새 OutputImage 생성 (이전 결과 보존, 사용자가 비교 가능)
 *
 * 비용: 1 credit (COMPOSE).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { composeWithTranslations, type ComposeRegion } from '@/lib/pipeline/compose';
import { uploadToR2, fetchAsBuffer } from '@/lib/storage/r2';
import { spendCredits, CREDIT_RATES } from '@/lib/credit';
import { randomUUID } from 'crypto';

export const maxDuration = 30;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id: scrapedImageId } = await ctx.params;

    let regionUserOverrides: Record<string, string> = {};
    try {
        const body = await req.json();
        regionUserOverrides = body?.regionUserOverrides || {};
    } catch {
        return NextResponse.json({ error: 'JSON body 파싱 실패' }, { status: 400 });
    }

    // ScrapedImage 조회 + 본인 소유 검증
    const scrapedImage = await prisma.scrapedImage.findFirst({
        where: { id: scrapedImageId, product: { userId } },
        include: {
            textRegions: { orderBy: { detectedAt: 'asc' } },
            outputs: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
    });
    if (!scrapedImage) return NextResponse.json({ error: 'Image 없음' }, { status: 404 });
    if (scrapedImage.textRegions.length === 0) {
        return NextResponse.json({ error: '탐지된 텍스트가 없어 재합성 불필요' }, { status: 400 });
    }

    const latestOutput = scrapedImage.outputs[0];
    const inpaintedR2Url = (latestOutput?.metadata as any)?.inpaintedR2Url;
    if (!inpaintedR2Url) {
        return NextResponse.json(
            { error: '인페인팅된 이미지가 없습니다. 처음부터 다시 처리해주세요.' },
            { status: 400 },
        );
    }

    // credits 차감
    const spend = await spendCredits(userId, {
        amount: CREDIT_RATES.COMPOSE,
        bot: 'pdpbot',
        action: 'COMPOSE',
        refType: 'ScrapedImage',
        refId: scrapedImageId,
        metadata: { recompose: true, regionCount: scrapedImage.textRegions.length },
    });
    if (!spend.ok) return NextResponse.json({ error: spend.error || '잔액 부족' }, { status: 402 });

    try {
        // 1) DB 갱신 — userOverride 적용
        for (const region of scrapedImage.textRegions) {
            if (regionUserOverrides[region.id] !== undefined) {
                await prisma.textRegion.update({
                    where: { id: region.id },
                    data: { userOverride: regionUserOverrides[region.id] || null },
                });
            }
        }

        // 2) 새 합성용 region list — userOverride 우선, 없으면 기존 translatedText
        const composeRegions: ComposeRegion[] = scrapedImage.textRegions.map(r => ({
            bboxX: r.bboxX,
            bboxY: r.bboxY,
            bboxW: r.bboxW,
            bboxH: r.bboxH,
            originalText: r.originalText,
            translatedText: regionUserOverrides[r.id] ?? r.userOverride ?? r.translatedText ?? r.originalText,
        }));

        // 3) 인페인팅 이미지 fetch + 합성
        const inpaintedBuf = await fetchAsBuffer(inpaintedR2Url);
        const finalBuf = await composeWithTranslations(inpaintedBuf, composeRegions);

        // 4) 새 OutputImage 저장
        const taskId = randomUUID();
        const outputKey = `pdp/${userId}/${scrapedImage.productId}/${taskId}/output-recompose.png`;
        const outputUrl = await uploadToR2(outputKey, finalBuf, 'image/png');

        await prisma.outputImage.create({
            data: {
                productId: scrapedImage.productId,
                sourceImageId: scrapedImage.id,
                r2Url: outputUrl,
                width: scrapedImage.width,
                height: scrapedImage.height,
                mode: 'inpaint_translate',
                creditsUsed: CREDIT_RATES.COMPOSE,
                // 같은 inpaintedR2Url 재사용 — 다음 재합성도 빠름.
                metadata: { taskId, recompose: true, inpaintedR2Url } as any,
            },
        });

        return NextResponse.json({
            ok: true,
            outputUrl,
            creditsUsed: CREDIT_RATES.COMPOSE,
            balanceAfter: spend.balanceAfter,
        });
    } catch (e: any) {
        console.error('[/api/scraped-images/recompose] error', e);
        // 환불
        const { addCredits } = await import('@/lib/credit');
        await addCredits(userId, CREDIT_RATES.COMPOSE, 'pdpbot', 'REFUND', {
            reason: 'recompose failed',
            error: e?.message,
        }).catch(() => {});

        return NextResponse.json({ error: e?.message || '재합성 실패 (credits 환불됨)' }, { status: 500 });
    }
}
