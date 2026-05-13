/**
 * GET  /api/templates  → 내 템플릿 + 시스템 템플릿 목록
 * POST /api/templates  → 현재 디자인을 템플릿으로 저장
 *
 * POST Body:
 *   - designId: string   (저장할 디자인 ID)
 *   - title:    string
 *   - description?: string
 *   - tags?:    string[]
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const templates = await (prisma as any).designTemplate.findMany({
        where: {
            OR: [
                { userId },          // 내 템플릿
                { isPublic: true },  // 시스템/공개 템플릿
            ],
        },
        orderBy: [
            { userId: 'desc' },     // 내 것 먼저
            { usageCount: 'desc' },
        ],
        select: {
            id: true,
            userId: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            canvasSize: true,
            canvasWidth: true,
            canvasHeight: true,
            tags: true,
            isPublic: true,
            usageCount: true,
            createdAt: true,
        },
    });

    return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { designId, title, description, tags } = body;

    if (!designId || !title?.trim()) {
        return NextResponse.json({ error: 'designId 와 title 필요' }, { status: 400 });
    }

    // 소스 디자인 조회 (소유 확인)
    const design = await (prisma as any).design.findFirst({
        where: { id: designId, userId },
        select: {
            sceneJson: true, thumbnailUrl: true,
            canvasSize: true, canvasWidth: true, canvasHeight: true,
        },
    });
    if (!design) return NextResponse.json({ error: '디자인 없음' }, { status: 404 });

    const template = await (prisma as any).designTemplate.create({
        data: {
            userId,
            title: title.trim().slice(0, 80),
            description: description?.trim()?.slice(0, 200) || null,
            thumbnailUrl: design.thumbnailUrl || null,
            sceneJson: design.sceneJson,
            canvasSize: design.canvasSize,
            canvasWidth: design.canvasWidth,
            canvasHeight: design.canvasHeight,
            tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
            isPublic: false,
        },
    });

    return NextResponse.json({ ok: true, template });
}
