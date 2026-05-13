/**
 * PUT    /api/brand-kits/[id]   → 업데이트
 * DELETE /api/brand-kits/[id]   → 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const existing = await (prisma as any).brandKit.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: '키트 없음' }, { status: 404 });

    const data: any = {};
    if (typeof body.name === 'string') data.name = body.name.slice(0, 60);
    if (Array.isArray(body.colors)) {
        data.colors = body.colors.filter((c: any) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 5);
    }
    if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl || null;
    if (body.fontFamily !== undefined) data.fontFamily = body.fontFamily || null;
    if (typeof body.isDefault === 'boolean') {
        if (body.isDefault) {
            await (prisma as any).brandKit.updateMany({
                where: { userId, isDefault: true, NOT: { id } },
                data: { isDefault: false },
            });
        }
        data.isDefault = body.isDefault;
    }

    const updated = await (prisma as any).brandKit.update({ where: { id }, data });
    return NextResponse.json({ ok: true, kit: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;
    try {
        await (prisma as any).brandKit.deleteMany({ where: { id, userId } });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
    }
}
