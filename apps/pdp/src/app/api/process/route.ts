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
import { spendCredits, addCredits, CREDIT_RATES } from '@/lib/credit';
import { computeByokAdjustedCost } from '@/lib/byok-cost';
import { getUserApiKeysBulk } from '@/lib/api-keys';

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

    // BYOK 체크 — 3개 프로바이더 한 번의 DB 쿼리로 일괄 조회 (sequential await x3 → 단일 findMany)
    const userKeys = await getUserApiKeysBulk(userId, ['openai', 'anthropic', 'replicate']);
    const ocrUserKey = userKeys.openai ?? null;
    const translateUserKey = userKeys.anthropic ?? null;
    const inpaintUserKey = userKeys.replicate ?? null;

    const ocrCost = computeByokAdjustedCost(CREDIT_RATES.OCR, !!ocrUserKey);
    const translateCost = computeByokAdjustedCost(CREDIT_RATES.TRANSLATE, !!translateUserKey);
    const inpaintCost = computeByokAdjustedCost(CREDIT_RATES.INPAINT, !!inpaintUserKey);
    const composeCost = CREDIT_RATES.COMPOSE;

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
        const regions = await detectTextRegions(originalR2Url, ocrUserKey);
        const ocrSpend = await spendCredits(userId, {
            amount: ocrCost,
            bot: 'pdpbot',
            action: 'OCR',
            metadata: { taskId, regionCount: regions.length, byok: !!ocrUserKey },
        });
        if (!ocrSpend.ok) throw new Error(ocrSpend.error || '잔액 부족 (OCR)');
        creditsUsed += ocrCost;

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
        const translations = await translateRegionsBatch(regions, translateUserKey);
        const translateSpend = await spendCredits(userId, {
            amount: translateCost,
            bot: 'pdpbot',
            action: 'TRANSLATE',
            metadata: { taskId, regionCount: regions.length, byok: !!translateUserKey },
        });
        if (!translateSpend.ok) throw new Error(translateSpend.error || '잔액 부족 (TRANSLATE)');
        creditsUsed += translateCost;

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

        // === Step 5: FLUX 인페인팅 (buffer 직접 반환) ===
        const inpaintedBuf = await runInpaint({
            imageUrl: originalR2Url,
            maskUrl: maskR2Url,
            userReplicateKey: inpaintUserKey,
        });
        const inpaintSpend = await spendCredits(userId, {
            amount: inpaintCost,
            bot: 'pdpbot',
            action: 'INPAINT',
            metadata: { taskId, byok: !!inpaintUserKey },
        });
        if (!inpaintSpend.ok) throw new Error(inpaintSpend.error || '잔액 부족 (INPAINT)');
        creditsUsed += inpaintCost;

        // === Step 6: 인페인팅 buffer R2 별도 저장 (재합성 위해) + 텍스트 합성 ===
        const inpaintedKey = `pdp/${userId}/${product.id}/${taskId}/inpainted.png`;
        const inpaintedR2Url = await uploadToR2(inpaintedKey, inpaintedBuf, 'image/png');

        const composeRegions: ComposeRegion[] = regions.map((r, i) => ({
            ...r,
            translatedText: finalTexts[i],
        }));
        const finalBuf = await composeWithTranslations(inpaintedBuf, composeRegions);

        const composeSpend = await spendCredits(userId, {
            amount: composeCost,
            bot: 'pdpbot',
            action: 'COMPOSE',
            metadata: { taskId },
        });
        if (!composeSpend.ok) throw new Error(composeSpend.error || '잔액 부족 (COMPOSE)');
        creditsUsed += composeCost;

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
                // inpaintedR2Url 보존 — 재합성 시 인페인팅 skip 하고 합성만 (1 credit).
                metadata: { taskId, regionCount: regions.length, inpaintedR2Url } as any,
            },
        });

        // ScrapedImage 에도 inpaintedR2Url 저장 — 재합성 시 빠른 조회.
        await prisma.scrapedImage.update({
            where: { id: scrapedImage.id },
            data: {
                // ScrapedImage 에 metadata 컬럼 없으니 r2Url 옆에 별도 필드 추가는 schema 변경 필요.
                // 일단 OutputImage.metadata.inpaintedR2Url 만 사용 — recompose endpoint 가 거기서 읽음.
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
        // 부분 환불 — pipeline 도중 실패 시 이미 차감된 step 들 (OCR/TRANSLATE/INPAINT) 합계 환불.
        // 사용자가 7단계 중 마지막 단계 실패해도 비용 부담 X (셀러 보호).
        if (creditsUsed > 0) {
            await addCredits(userId, creditsUsed, 'pdpbot', 'REFUND', {
                reason: 'process pipeline failed',
                taskId,
                error: e?.message,
            }).catch(() => {});
        }
        return NextResponse.json(
            { error: e?.message || '처리 실패', creditsUsed: 0, refunded: creditsUsed },
            { status: 500 },
        );
    }
}
