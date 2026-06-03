import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { prisma } from '@amakers/db';
import { resolveDesktopToken, bearerFromHeader } from '@/lib/agent-token';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * 데스크톱 에이전트 업로드 — 로컬 폴더의 이미지를 받아 Blob 에 저장 후 드롭 큐 적재.
 * 인증: Authorization: Bearer <desktop token>.
 * 본문: multipart/form-data (file, caption?) 또는 JSON ({ imageUrl, caption? }).
 */
export async function POST(req: NextRequest) {
  const userId = await resolveDesktopToken(bearerFromHeader(req.headers.get('authorization')));
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ct = req.headers.get('content-type') || '';
  try {
    let imageUrl = '';
    let caption: string | null = null;
    let source: string | null = null;

    if (ct.includes('application/json')) {
      const body = await req.json();
      imageUrl = String(body?.imageUrl || '').trim();
      caption = body?.caption ? String(body.caption) : null;
      source = body?.source ? String(body.source) : null;
      if (!/^https?:\/\//.test(imageUrl)) return NextResponse.json({ error: 'imageUrl 필요' }, { status: 400 });
    } else {
      const form = await req.formData();
      const file = form.get('file');
      caption = form.get('caption') ? String(form.get('caption')) : null;
      source = form.get('filename') ? String(form.get('filename')) : null;
      if (!file || typeof file === 'string') return NextResponse.json({ error: '파일 필요' }, { status: 400 });
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: 'Blob 스토리지가 설정되지 않았습니다. Vercel에서 Blob을 활성화하세요.' }, { status: 500 });
      }
      const name = source || (file as File).name || `drop-${Date.now()}.jpg`;
      const blob = await put(`agent-drops/${userId}/${Date.now()}-${name}`, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        addRandomSuffix: true,
      });
      imageUrl = blob.url;
    }

    const item = await prisma.agentDropItem.create({
      data: { userId, imageUrl, caption, source, status: 'PENDING' },
      select: { id: true },
    });
    const pending = await prisma.agentDropItem.count({ where: { userId, status: 'PENDING' } });
    return NextResponse.json({ ok: true, id: item.id, imageUrl, pending });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '업로드 실패' }, { status: 500 });
  }
}
