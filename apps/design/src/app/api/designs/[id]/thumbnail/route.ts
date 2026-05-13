/**
 * POST /api/designs/[id]/thumbnail
 *
 * Body: { dataUrl: 'data:image/png;base64,...' }
 *
 * 클라이언트가 Stage.toDataURL() 결과를 보내면 R2 에 업로드해 Design.thumbnailUrl 갱신.
 * 대시보드 갤러리에 표시됨.
 */

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadToR2, isR2Configured } from '@/lib/storage/r2';

export const maxDuration = 30;

const MAX_THUMB_WIDTH = 600;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    if (!isR2Configured()) {
        return NextResponse.json({ ok: false, skipped: 'R2 미설정' }, { status: 200 });
    }

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const dataUrl: string = body?.dataUrl || '';

    const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
    if (!match) return NextResponse.json({ error: 'dataUrl PNG base64 필요' }, { status: 400 });

    const design = await (prisma as any).design.findFirst({ where: { id, userId } });
    if (!design) return NextResponse.json({ error: '디자인 없음' }, { status: 404 });

    const fullBuf = Buffer.from(match[1], 'base64');
    // 썸네일은 600px 폭으로 리사이즈 (스토리지·로딩 속도)
    const thumbBuf = await sharp(fullBuf).resize({ width: MAX_THUMB_WIDTH, withoutEnlargement: true }).png().toBuffer();

    const key = `design/${userId}/${id}/thumbnail-${Date.now()}.png`;
    const url = await uploadToR2(key, thumbBuf, 'image/png');

    await (prisma as any).design.update({
        where: { id },
        data: { thumbnailUrl: url },
    });

    return NextResponse.json({ ok: true, thumbnailUrl: url });
}
