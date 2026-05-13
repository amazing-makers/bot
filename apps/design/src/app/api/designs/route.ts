/**
 * POST /api/designs  → 새 디자인 생성
 * GET  /api/designs  → 본인 디자인 목록 (대시보드)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getPresetByKey, CANVAS_PRESETS } from '@/lib/design/types';
import type { Scene } from '@/lib/design/types';

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const templateKey: string | undefined = body?.templateKey;
    const titleInput: string | undefined = body?.title;

    const preset = templateKey ? getPresetByKey(templateKey) : undefined;
    const width = preset?.width ?? Number(body?.width) ?? 1080;
    const height = preset?.height ?? Number(body?.height) ?? 1080;

    const scene: Scene = {
        width, height, background: '#ffffff', elements: [],
    };

    const design = await (prisma as any).design.create({
        data: {
            userId,
            title: titleInput || preset?.label || '제목 없음',
            canvasSize: templateKey || 'custom',
            canvasWidth: width,
            canvasHeight: height,
            sceneJson: scene as any,
            templateKey: templateKey || null,
        },
    });

    return NextResponse.json({ ok: true, designId: design.id });
}

export async function GET() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const designs = await (prisma as any).design.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: {
            id: true, title: true, canvasWidth: true, canvasHeight: true,
            thumbnailUrl: true, templateKey: true, updatedAt: true,
        },
    });
    return NextResponse.json({ ok: true, designs, presets: CANVAS_PRESETS });
}
