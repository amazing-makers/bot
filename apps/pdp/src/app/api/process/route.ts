/**
 * POST /api/process
 *
 * 이미지 1장을 통합 처리 — 다음 4단계를 순차 실행:
 *   1) 원본 이미지 R2 에 백업 (외부 URL → 영구 보관)
 *   2) GPT-4 Vision OCR — 텍스트 영역 (bbox + 원문) 탐지
 *   3) Claude Opus 번역 — region 들 한국어 일괄 번역
 *   4) Sharp 마스크 PNG 생성 + R2 업로드
 *   5) FLUX 1.1 Pro Fill 인페인팅 (이미지 + 마스크 → 글자 지운 이미지)
 *   6) Sharp 합성 — 인페인팅된 이미지 + 번역 텍스트 SVG 오버레이
 *   7) 결과 R2 업로드 + DB 저장
 *
 * Body:
 *   {
 *     productId: string,            // 미리 /api/extract 결과를 저장한 Product.id (옵션, 없으면 임시)
 *     imageUrl: string,             // 처리할 원본 이미지 URL (외부 사이트 또는 R2)
 *     userOverrides?: Record<idx, text>  // 사용자가 번역 수정한 경우
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     outputUrl: string,            // 최종 결과 PNG public URL
 *     regions: TextRegion[],        // 탐지·번역 결과 (UI 에서 수정 모달에 사용)
 *     creditsUsed: number,
 *   }
 *
 * 비용 (1 이미지당): OCR 5 + INPAINT 30 + TRANSLATE 5 + COMPOSE 1 = ~41 credits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { detectTextRegions } from '@/lib/pipeline/ocr';
import { buildMaskPng, runInpaint } from '@/lib/pipeline/inpaint';
import { translateRegionsBatch } from '@/lib/pipeline/translate';
import { composeWithTranslations, type ComposeRegion } from '@/lib/pipeline/compose';
import { uploadToR2, fetchAsBuffer, isR2Configured } from '@/lib/storage/r2';
import { spendCredits, CREDIT_RATES } from '@/lib/credit';

export const maxDuration = 300; // 5분 (FLUX inpainting 이 오래 걸릴 수 있음)

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    if (!isR2Configured()) {
        return NextResponse.json(
            { error: 'R2 가 설정되지 않았습니다. R2_ENDPOINT/ACCESS_KEY/SECRET/BUCKET env 변수 등록 필요.' },
            { status: 500 },
        );
    }

    let imageUrl: string;
    let userOverrides: Record<number, string> = {};
    let productId: string | undefined;
    let sourceUrl: string | undefined;
    let productTitle: string | undefined;
    let productSource: string = 'generic';
    try {
        const body = await req.json();
        imageUrl = String(body?.imageUrl || '').trim();
        productId = body?.productId ? String(body.productId) : undefined;
        sourceUrl = body?.sourceUrl ? String(body.sourceUrl) : undefined;
        productTitle = body?.productTitle ? String(body.productTitle) : undefined;
        productSource = body?.productSource ? String(body.productSource) : 'generic';
        if (body?.userOverrides && typeof body.userOverrides === 'object') {
            userOverrides = body.userOverrides;
        }
        if (!imageUrl) {
            return NextResponse.json({ error: 'imageUrl 필요' }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: 'JSON body 파싱 실패' }, { status: 400 });
    }

    // Product upsert — productId 가 있으면 그것 사용, 없으면 sourceUrl 기반 + userId 로 신규 또는 매칭.
    // sourceUrl 도 없으면 imageUrl 자체를 sourceUrl 로 (단일 이미지 처리).
    let product = productId
        ? await prisma.product.findFirst({ where: { id: productId, userId } })
        : null;
    if (!product) {
        product = await prisma.product.create({
            data: {
                userId,
                sourceUrl: sourceUrl || imageUrl,
                source: productSource,
                title: productTitle,
            },
        });
    }

    // 잔액 사전 체크 (실제 차감은 단계 성공 시마다)
    const totalEstimated = CREDIT_RATES.OCR + CREDIT_RATES.INPAINT + CREDIT_RATES.TRANSLATE + CREDIT_RATES.COMPOSE;

    let creditsUsed = 0;
    const taskId = randomUUID();

    // ScrapedImage 생성 (이번 호출의 원본 이미지)
    const scrapedImage = await prisma.scrapedImage.create({
        data: {
            productId: product.id,
            sourceUrl: imageUrl,
            type: 'detail',
        },
    });

    try {
        // === Step 1: 원본 이미지 R2 백업 ===
        const originalBuf = await fetchAsBuffer(imageUrl);
        const meta = await sharp(originalBuf).metadata();
        const originW = meta.width || 800;
        const originH = meta.height || 800;

        const originalKey = `pdp/${userId}/${product.id}/${taskId}/original.png`;
        const originalR2Url = await uploadToR2(originalKey, await sharp(originalBuf).png().toBuffer(), 'image/png');
        await prisma.scrapedImage.update({
            where: { id: scrapedImage.id },
            data: { r2Url: originalR2Url, width: originW, height: originH },
        });

        // === Step 2: GPT-4 Vision OCR ===
        const regions = await detectTextRegions(originalR2Url);
        const ocrSpend = await spendCredits(userId, {
            amount: CREDIT_RATES.OCR,
            bot: 'pdpbot',
            action: 'OCR',
            metadata: { taskId, regionCount: regions.length },
        });
        if (!ocrSpend.ok) throw new Error(ocrSpend.error || '잔액 부족 (OCR)');
        creditsUsed += CREDIT_RATES.OCR;

        if (regions.length === 0) {
            // 텍스트 없는 이미지 — 인페인팅 skip, 원본 그대로 결과 + DB 에 OutputImage 동일하게 저장
            await prisma.outputImage.create({
                data: {
                    productId: product.id,
                    sourceImageId: scrapedImage.id,
                    r2Url: originalR2Url,
                    width: originW,
                    height: originH,
                    mode: 'inpaint_translate',
                    creditsUsed,
                    metadata: { skippedReason: 'no_text_detected' } as any,
                },
            });
            return NextResponse.json({
                ok: true,
                productId: product.id,
                outputUrl: originalR2Url,
                regions: [],
                creditsUsed,
                message: '텍스트가 탐지되지 않아 원본 그대로 반환',
            });
        }

        // === Step 3: Claude 일괄 번역 ===
        const translations = await translateRegionsBatch(regions);
        const translateSpend = await spendCredits(userId, {
            amount: CREDIT_RATES.TRANSLATE,
            bot: 'pdpbot',
            action: 'TRANSLATE',
            metadata: { taskId, regionCount: regions.length },
        });
        if (!translateSpend.ok) throw new Error(translateSpend.error || '잔액 부족 (TRANSLATE)');
        creditsUsed += CREDIT_RATES.TRANSLATE;

        // 사용자 직접 입력 오버라이드 적용
        const finalTexts = translations.map((t, i) => userOverrides[i] || t);

        // TextRegion DB 저장
        await prisma.textRegion.createMany({
            data: regions.map((r, i) => ({
                scrapedImageId: scrapedImage.id,
                bboxX: r.bboxX,
                bboxY: r.bboxY,
                bboxW: r.bboxW,
                bboxH: r.bboxH,
                originalText: r.originalText,
                sourceLanguage: r.sourceLanguage,
                translatedText: finalTexts[i],
                userOverride: userOverrides[i],
            })),
        });

        // === Step 4: 마스크 PNG 생성 + R2 업로드 ===
        const maskBuf = await buildMaskPng(originW, originH, regions);
        const maskKey = `pdp/${userId}/${product.id}/${taskId}/mask.png`;
        const maskR2Url = await uploadToR2(maskKey, maskBuf, 'image/png');

        // === Step 5: FLUX 인페인팅 ===
        const inpaintedUrl = await runInpaint({
            imageUrl: originalR2Url,
            maskUrl: maskR2Url,
        });
        const inpaintSpend = await spendCredits(userId, {
            amount: CREDIT_RATES.INPAINT,
            bot: 'pdpbot',
            action: 'INPAINT',
            metadata: { taskId },
        });
        if (!inpaintSpend.ok) throw new Error(inpaintSpend.error || '잔액 부족 (INPAINT)');
        creditsUsed += CREDIT_RATES.INPAINT;

        // === Step 6: 인페인팅 결과 다운로드 + 텍스트 합성 ===
        const inpaintedBuf = await fetchAsBuffer(inpaintedUrl);
        const composeRegions: ComposeRegion[] = regions.map((r, i) => ({
            ...r,
            translatedText: finalTexts[i],
        }));
        const finalBuf = await composeWithTranslations(inpaintedBuf, composeRegions);

        const composeSpend = await spendCredits(userId, {
            amount: CREDIT_RATES.COMPOSE,
            bot: 'pdpbot',
            action: 'COMPOSE',
            metadata: { taskId },
        });
        if (!composeSpend.ok) throw new Error(composeSpend.error || '잔액 부족 (COMPOSE)');
        creditsUsed += CREDIT_RATES.COMPOSE;

        // === Step 7: 결과 R2 업로드 + OutputImage DB 저장 ===
        const outputKey = `pdp/${userId}/${product.id}/${taskId}/output.png`;
        const outputUrl = await uploadToR2(outputKey, finalBuf, 'image/png');
        await prisma.outputImage.create({
            data: {
                productId: product.id,
                sourceImageId: scrapedImage.id,
                r2Url: outputUrl,
                width: originW,
                height: originH,
                mode: 'inpaint_translate',
                creditsUsed,
                metadata: { taskId, regionCount: regions.length } as any,
            },
        });

        return NextResponse.json({
            ok: true,
            productId: product.id,
            outputUrl,
            regions: regions.map((r, i) => ({
                ...r,
                translatedText: finalTexts[i],
                originalIndex: i,
            })),
            creditsUsed,
            balanceAfter: composeSpend.balanceAfter,
        });
    } catch (e: any) {
        console.error('[/api/process] error', e);
        return NextResponse.json(
            { error: e?.message || '처리 실패', creditsUsed },
            { status: 500 },
        );
    }
}
