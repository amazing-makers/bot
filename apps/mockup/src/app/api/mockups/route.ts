/**
 * GET  /api/mockups — 사용자 목업 목록 조회
 * POST /api/mockups — 새 목업 레코드 생성 (status=pending)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const mockups = await (prisma as any).mockup.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
            id: true,
            title: true,
            mockupType: true,
            productImageUrl: true,
            outputUrl: true,
            thumbnailUrl: true,
            status: true,
            creditsUsed: true,
            createdAt: true,
        },
    });

    const total = await (prisma as any).mockup.count({ where: { userId } });

    return NextResponse.json({ mockups, total });
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    let body: {
        title?: string;
        productImageUrl: string;
        mockupType: string;
        customPrompt?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 });
    }

    if (!body.productImageUrl || !body.mockupType) {
        return NextResponse.json(
            { error: 'productImageUrl 과 mockupType 은 필수입니다' },
            { status: 400 },
        );
    }

    const mockup = await (prisma as any).mockup.create({
        data: {
            userId,
            title: body.title || null,
            productImageUrl: body.productImageUrl,
            mockupType: body.mockupType,
            customPrompt: body.customPrompt || null,
            status: 'pending',
        },
    });

    return NextResponse.json({ mockup }, { status: 201 });
}
