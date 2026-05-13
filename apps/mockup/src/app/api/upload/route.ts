/**
 * POST /api/upload
 * 사용자 상품 이미지를 R2 에 업로드하고 public URL 반환.
 * MockupCreator.tsx 에서 productImageUrl 획득에 사용.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToR2, isR2Configured } from '@/lib/storage/r2';
import { randomUUID } from 'crypto';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
    }
    const userId = (session.user as any).id as string;

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: '요청 형식이 올바르지 않습니다' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return NextResponse.json({ error: 'file 필드가 필요합니다' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: '이미지 파일만 업로드할 수 있습니다' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: '파일 크기는 10MB 이하여야 합니다' }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab);

    // R2 업로드
    if (!isR2Configured()) {
        // dev fallback: base64 data URL
        const b64 = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${b64}`;
        return NextResponse.json({ url: dataUrl });
    }

    const ext = file.name.split('.').pop() || 'png';
    const key = `mockup/${userId}/input/${randomUUID()}.${ext}`;
    const url = await uploadToR2(key, buffer, file.type);

    return NextResponse.json({ url });
}
