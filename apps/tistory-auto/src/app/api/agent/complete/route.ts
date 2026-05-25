import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAgentToken, bearerFromHeader } from '@/lib/agent-token';

export const dynamic = 'force-dynamic';

/**
 * 에이전트 발행 결과 보고.
 * 인증: Authorization: Bearer <agent token>
 * body: { postId, ok, remotePostId?, link?, error? }
 */
export async function POST(req: NextRequest) {
    const userId = await resolveAgentToken(bearerFromHeader(req.headers.get('authorization')));
    if (!userId) return NextResponse.json({ error: 'invalid agent token' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const postId = String(body?.postId || '');
    if (!postId) return NextResponse.json({ error: 'postId 필요' }, { status: 400 });

    const post = await prisma.tistoryPost.findFirst({ where: { id: postId, userId }, select: { id: true } });
    if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 });

    if (body?.ok) {
        await prisma.tistoryPost.update({
            where: { id: post.id },
            data: {
                status: 'PUBLISHED',
                publishedAt: new Date(),
                remotePostId: body?.remotePostId ? String(body.remotePostId) : null,
                link: body?.link ? String(body.link) : null,
                error: null,
            },
        });
    } else {
        await prisma.tistoryPost.update({
            where: { id: post.id },
            data: { status: 'FAILED', error: String(body?.error || '에이전트 발행 실패') },
        });
    }

    return NextResponse.json({ ok: true });
}
