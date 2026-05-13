/**
 * POST /api/mockups/[id]/generate
 *
 * FLUX Kontext Pro 로 목업 이미지 생성.
 * - 30 credits 차감 (BYOK Replicate 사용 시 0 credits).
 * - 생성 결과를 R2 에 업로드 → mockup.outputUrl 업데이트.
 * - 실패 시 자동 환불 (withCreditRefund 패턴).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { withCreditRefund } from '@/lib/credit';
import { generateMockup } from '@/lib/pipeline/generate-mockup';
import { uploadToR2, isR2Configured } from '@/lib/storage/r2';

const MOCKUP_CREDIT_COST = 30;

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    const { id: mockupId } = params;

    // 목업 레코드 확인
    const mockup = await (prisma as any).mockup.findUnique({
        where: { id: mockupId },
    });

    if (!mockup) {
        return NextResponse.json({ error: '목업을 찾을 수 없습니다' }, { status: 404 });
    }

    if (mockup.userId !== userId) {
        return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
    }

    if (mockup.status === 'generating') {
        return NextResponse.json({ error: '이미 생성 중입니다' }, { status: 409 });
    }

    if (mockup.status === 'done') {
        return NextResponse.json({ error: '이미 생성이 완료되었습니다' }, { status: 409 });
    }

    // generating 상태로 업데이트
    await (prisma as any).mockup.update({
        where: { id: mockupId },
        data: { status: 'generating' },
    });

    try {
        const guard = await withCreditRefund(
            userId,
            {
                action: 'INPAINT', // replicate 프로바이더 BYOK 체크
                baseCost: MOCKUP_CREDIT_COST,
                bot: 'mockupbot',
                refType: 'Mockup',
                refId: mockupId,
            },
            async ({ userKey }) => {
                // FLUX Kontext Pro 목업 생성
                const { buffer, contentType } = await generateMockup({
                    productImageUrl: mockup.productImageUrl,
                    mockupType: mockup.mockupType,
                    customPrompt: mockup.customPrompt || undefined,
                    userReplicateKey: userKey,
                });

                let outputUrl: string;

                if (isR2Configured()) {
                    const key = `mockup/${userId}/${mockupId}/output.png`;
                    outputUrl = await uploadToR2(key, buffer, contentType);
                } else {
                    // R2 미설정 시 data URL 폴백 (dev 용도)
                    const b64 = buffer.toString('base64');
                    outputUrl = `data:${contentType};base64,${b64}`;
                }

                return { outputUrl };
            },
        );

        // 성공 — DB 업데이트
        const updated = await (prisma as any).mockup.update({
            where: { id: mockupId },
            data: {
                status: 'done',
                outputUrl: guard.result.outputUrl,
                thumbnailUrl: guard.result.outputUrl, // 썸네일은 동일 URL (추후 리사이즈)
                creditsUsed: guard.creditsUsed,
            },
        });

        return NextResponse.json({
            mockup: updated,
            creditsUsed: guard.creditsUsed,
            balanceAfter: guard.balanceAfter,
            byok: guard.byok,
        });
    } catch (e: any) {
        // 실패 — DB 업데이트
        await (prisma as any).mockup.update({
            where: { id: mockupId },
            data: { status: 'failed' },
        }).catch(() => {});

        const status = e?.status === 402 ? 402 : 500;
        return NextResponse.json(
            { error: e?.message || '목업 생성에 실패했습니다' },
            { status },
        );
    }
}
