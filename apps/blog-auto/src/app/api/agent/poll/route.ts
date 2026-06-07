import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAgentToken, bearerFromHeader } from '@/lib/agent-token';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** 네이버 발행 큐 폴링 — SCHEDULED + provider=NAVER 글을 claim(PUBLISHING) 후 에이전트에 전달. */
async function handle(req: NextRequest) {
  const userId = await resolveAgentToken(bearerFromHeader(req.headers.get('authorization')));
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const now = new Date();
  const due = await prisma.blogPost.findMany({
    where: {
      userId,
      status: 'SCHEDULED',
      account: { provider: 'NAVER' },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    },
    include: { account: { select: { username: true, siteUrl: true } } },
    take: 10,
    orderBy: { createdAt: 'asc' },
  });

  const tasks: any[] = [];
  for (const p of due) {
    const claim = await prisma.blogPost.updateMany({
      where: { id: p.id, status: 'SCHEDULED' },
      data: { status: 'PUBLISHING', lastAttemptAt: now, attemptCount: { increment: 1 } },
    });
    if (claim.count === 0) continue; // 다른 폴이 가져감
    tasks.push({
      postId: p.id,
      blogId: p.account.username,
      siteUrl: p.account.siteUrl,
      title: p.title,
      content: p.content,
      photoUrl: p.photoUrl,
    });
  }
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) { return handle(req); }
export async function GET(req: NextRequest) { return handle(req); }
