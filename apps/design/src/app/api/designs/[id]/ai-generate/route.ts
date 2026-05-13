/**
 * POST /api/designs/[id]/ai-generate
 *
 * Phase 2 — 프롬프트 받아 Claude(layout) + 옵션 FLUX(배경) 로 디자인 자동 생성.
 *
 * Body:
 *   - prompt:           string  (사용자 자연어 요청)
 *   - withBackground?:  boolean (FLUX 로 배경 이미지 같이 생성)
 *   - brandColors?:     string[] (옵션)
 *
 * 비용:
 *   - layout (Claude): 10 credits (ANALYZE 단가 재사용)
 *   - +background (FLUX): 20 credits (IMAGE_GEN 단가)
 *   - BYOK 적용 시 각각 0
 *
 * 동작:
 *   1) (옵션) FLUX 로 배경 이미지 생성 → R2 업로드
 *   2) Claude 가 layout JSON 생성 (배경 URL 알려줘)
 *   3) Design.sceneJson 업데이트 + 응답
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateDesignScene } from '@/lib/pipeline/generate-design';
import { generateBackgroundImage } from '@/lib/pipeline/generate-bg-image';
import { uploadToR2, isR2Configured } from '@/lib/storage/r2';
import { withCreditRefund } from '@/lib/credit';

export const maxDuration = 120;

const LAYOUT_COST = 10;
const BG_IMAGE_COST = 20;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const prompt: string = String(body?.prompt || '').trim();
    const withBackground: boolean = !!body?.withBackground;
    let brandColors: string[] | undefined = Array.isArray(body?.brandColors) ? body.brandColors : undefined;
    const brandKitId: string | undefined = body?.brandKitId;

    if (!prompt || prompt.length < 3) {
        return NextResponse.json({ error: '프롬프트가 너무 짧음 (3자 이상)' }, { status: 400 });
    }

    const { id } = await ctx.params;
    const design = await (prisma as any).design.findFirst({ where: { id, userId } });
    if (!design) return NextResponse.json({ error: '디자인 없음' }, { status: 404 });

    // brandColors 명시 X → brandKitId 또는 default kit 자동 적용
    if (!brandColors) {
        const kit = brandKitId
            ? await (prisma as any).brandKit.findFirst({ where: { id: brandKitId, userId } })
            : await (prisma as any).brandKit.findFirst({ where: { userId, isDefault: true } });
        if (kit?.colors?.length) brandColors = kit.colors;
    }

    const canvasWidth = design.canvasWidth || 1080;
    const canvasHeight = design.canvasHeight || 1080;

    if (withBackground && !isR2Configured()) {
        return NextResponse.json({ error: '배경 이미지 옵션은 R2 storage 가 설정되어야 합니다' }, { status: 500 });
    }

    let backgroundImageUrl: string | undefined;
    let bgCreditsUsed = 0;
    let bgByok = false;

    try {
        // Step 1 (옵션): FLUX 배경 이미지
        if (withBackground) {
            const bgGuarded = await withCreditRefund(
                userId,
                {
                    action: 'IMAGE_GEN',
                    baseCost: BG_IMAGE_COST,
                    bot: 'designbot',
                    refType: 'Design',
                    refId: design.id,
                    metadata: { phase: '2.2', kind: 'bg_image', prompt },
                },
                async ({ userKey }) => {
                    const { buffer } = await generateBackgroundImage({
                        userPrompt: prompt,
                        canvasWidth, canvasHeight,
                        userReplicateKey: userKey,
                    });
                    const key = `design/${userId}/${design.id}/bg-${Date.now()}.png`;
                    return await uploadToR2(key, buffer, 'image/png');
                },
            );
            backgroundImageUrl = bgGuarded.result;
            bgCreditsUsed = bgGuarded.creditsUsed;
            bgByok = bgGuarded.byok;
        }

        // Step 2: Claude layout
        const layoutGuarded = await withCreditRefund(
            userId,
            {
                action: 'OUTLINE',
                baseCost: LAYOUT_COST,
                bot: 'designbot' as any,
                refType: 'Design',
                refId: design.id,
                metadata: { phase: '2.1', kind: 'layout', prompt, withBackground },
            },
            async ({ userKey }) => {
                return await generateDesignScene({
                    prompt,
                    canvasWidth, canvasHeight,
                    canvasFormat: design.canvasSize || 'custom',
                    brandColors,
                    backgroundImageUrl,
                    userAnthropicKey: userKey,
                });
            },
        );

        const scene = layoutGuarded.result;

        // Step 3: Design.sceneJson 업데이트
        await (prisma as any).design.update({
            where: { id: design.id },
            data: {
                sceneJson: scene as any,
                metadata: {
                    ...(design.metadata as any || {}),
                    lastAiPrompt: prompt,
                    lastAiAt: new Date().toISOString(),
                } as any,
            },
        });

        return NextResponse.json({
            ok: true,
            scene,
            creditsUsed: layoutGuarded.creditsUsed + bgCreditsUsed,
            byok: layoutGuarded.byok || bgByok,
            balanceAfter: layoutGuarded.balanceAfter,
        });
    } catch (e: any) {
        console.error('[/api/designs/ai-generate] error', e);
        return NextResponse.json(
            { error: e?.message || 'AI 생성 실패' },
            { status: e?.status === 402 ? 402 : 500 },
        );
    }
}
