/**
 * GET    /api/designs/[id]   → 디자인 1개 조회
 * PUT    /api/designs/[id]   → scene + title 업데이트
 * DELETE /api/designs/[id]   → 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;
    const design = await (prisma as any).design.findFirst({ where: { id, userId } });
    if (!design) return NextResponse.json({ error: '디자인 없음' }, { status: 404 });

    return NextResponse.json({ ok: true, design });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const title: string | undefined = body?.title;
    const scene = body?.scene;

    if (!scene || typeof scene !== 'object') {
        return NextResponse.json({ error: 'scene 필요' }, { status: 400 });
    }

    const existing = await (prisma as any).design.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: '디자인 없음' }, { status: 404 });

    const updated = await (prisma as any).design.update({
        where: { id },
        data: {
            title: title !== undefined ? title : existing.title,
            sceneJson: scene,
            canvasWidth: Number(scene.width) || existing.canvasWidth,
            canvasHeight: Number(scene.height) || existing.canvasHeight,
        },
    });

    return NextResponse.json({ ok: true, design: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;
    try {
        await (prisma as any).design.delete({ where: { id, userId } as any });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: '삭제 실패 (없거나 권한 없음)' }, { status: 404 });
    }
}
