import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAgentToken, bearerFromHeader } from '@/lib/agent-token';

export const dynamic = 'force-dynamic';

/**
 * 데스크톱 에이전트 폴링 — QUEUED 글을 가져가 PUBLISHING 으로 전환 후 반환.
 * 인증: Authorization: Bearer <agent token>
 */
export async function POST(req: NextRequest) {
    const userId = await resolveAgentToken(bearerFromHeader(req.headers.get('authorization')));
    if (!userId) return NextResponse.json({ error: 'invalid agent token' }, { status: 401 });

    const queued = await prisma.tistoryPost.findMany({
        where: { userId, status: 'QUEUED' },
        orderBy: { createdAt: 'asc' },
        take: 5,
        include: { account: { select: { siteUrl: true } } },
    });

    if (queued.length === 0) return NextResponse.json({ tasks: [] });

    const ids = queued.map((p) => p.id);
    await prisma.tistoryPost.updateMany({
        where: { id: { in: ids }, status: 'QUEUED' },
        data: { status: 'PUBLISHING' },
    });

    const tasks = queued.map((p) => ({
        postId: p.id,
        siteUrl: p.account.siteUrl,
        title: p.title,
        content: p.content,
        photoUrl: p.photoUrl,
    }));

    return NextResponse.json({ tasks });
}
