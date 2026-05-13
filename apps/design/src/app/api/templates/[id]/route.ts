/**
 * GET    /api/templates/[id]       → 템플릿 상세 (sceneJson 포함)
 * POST   /api/templates/[id]/use   → 이 템플릿으로 새 디자인 생성
 * DELETE /api/templates/[id]       → 내 템플릿 삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;
    const template = await (prisma as any).designTemplate.findFirst({
        where: {
            id,
            OR: [{ userId }, { isPublic: true }],
        },
    });
    if (!template) return NextResponse.json({ error: '템플릿 없음' }, { status: 404 });

    return NextResponse.json({ template });
}

export async function POST(req: NextRequest, ctx: Ctx) {
    // POST /api/templates/[id] → use: 템플릿으로 새 디자인 생성
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;
    const template = await (prisma as any).designTemplate.findFirst({
        where: {
            id,
            OR: [{ userId }, { isPublic: true }],
        },
    });
    if (!template) return NextResponse.json({ error: '템플릿 없음' }, { status: 404 });

    // 새 디자인 생성
    const design = await (prisma as any).design.create({
        data: {
            userId,
            title: `${template.title} (복사)`,
            canvasSize: template.canvasSize,
            canvasWidth: template.canvasWidth,
            canvasHeight: template.canvasHeight,
            sceneJson: template.sceneJson,
            templateKey: template.id,
            metadata: { fromTemplate: template.id, fromTemplateTitle: template.title },
        },
    });

    // 사용 횟수 증가
    await (prisma as any).designTemplate.update({
        where: { id: template.id },
        data: { usageCount: { increment: 1 } },
    });

    return NextResponse.json({
        ok: true,
        designId: design.id,
        editorUrl: `/editor/${design.id}`,
    });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const { id } = await ctx.params;
    const deleted = await (prisma as any).designTemplate.deleteMany({
        where: { id, userId }, // 본인 것만 삭제 가능
    });

    if (deleted.count === 0) {
        return NextResponse.json({ error: '삭제할 수 없습니다 (없거나 권한 없음)' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
