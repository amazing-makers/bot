/**
 * GET  /api/brand-kits         → 본인 브랜드 키트 목록
 * POST /api/brand-kits         → 새 브랜드 키트 생성
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const kits = await (prisma as any).brandKit.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json({ ok: true, kits });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name: string = String(body?.name || '브랜드 키트').slice(0, 60);
    const colors: string[] = Array.isArray(body?.colors)
        ? body.colors.filter((c: any) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)).slice(0, 5)
        : [];
    const logoUrl: string | undefined = body?.logoUrl || undefined;
    const fontFamily: string | undefined = body?.fontFamily || undefined;
    const isDefault: boolean = !!body?.isDefault;

    if (colors.length === 0) {
        return NextResponse.json({ error: '색상 1개 이상 필요 (#hex 형식)' }, { status: 400 });
    }

    // isDefault 면 기존 default 해제
    if (isDefault) {
        await (prisma as any).brandKit.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });
    }

    const kit = await (prisma as any).brandKit.create({
        data: { userId, name, colors, logoUrl, fontFamily, isDefault },
    });
    return NextResponse.json({ ok: true, kit });
}
