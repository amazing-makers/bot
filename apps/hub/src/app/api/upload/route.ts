import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** 로그인 사용자의 이미지 업로드 → Vercel Blob → 공개 URL 반환. */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: '이미지 저장소(Blob)가 설정되지 않았습니다.' }, { status: 500 });
  }
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return NextResponse.json({ error: '파일이 필요합니다' }, { status: 400 });
    const f = file as File;
    if (f.size > 15 * 1024 * 1024) return NextResponse.json({ error: '파일이 너무 큽니다(최대 15MB)' }, { status: 400 });
    const name = f.name || `img-${Date.now()}.jpg`;
    const blob = await put(`uploads/${userId}/${Date.now()}-${name}`, f, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || '업로드 실패' }, { status: 500 });
  }
}
