import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAgentToken, bearerFromHeader } from '@/lib/agent-token';

export const dynamic = 'force-dynamic';

/** 에이전트 발행 결과 보고 — PUBLISHED/FAILED. */
export async function POST(req: NextRequest) {
  const userId = await resolveAgentToken(bearerFromHeader(req.headers.get('authorization')));
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const postId = String(body?.postId || '');
  const ok = !!body?.ok;
  const link = body?.link ? String(body.link) : null;
  const error = body?.error ? String(body.error) : null;
  if (!postId) return NextResponse.json({ error: 'postId 필요' }, { status: 400 });

  const post = await prisma.blogPost.findFirst({ where: { id: postId, userId }, select: { id: true } });
  if (!post) return NextResponse.json({ error: '글을 찾을 수 없음' }, { status: 404 });

  if (ok) {
    await prisma.blogPost.update({
      where: { id: postId },
      data: { status: 'PUBLISHED', publishedAt: new Date(), link, error: null },
    });
  } else {
    await prisma.blogPost.update({
      where: { id: postId },
      data: { status: 'FAILED', error: error || '에이전트 발행 실패' },
    });
  }
  return NextResponse.json({ ok: true });
}
