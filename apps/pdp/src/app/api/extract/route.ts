/**
 * POST /api/extract
 * Body: { url: string }
 * Response: { title?, source, images: [{ url, alt?, type }] }
 *
 * Phase 1: generic 스크래핑 (og:image + 큰 img 태그). 사이트별 specialized 는 Phase 1.1.
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeProductPage } from '@/lib/scrapers';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const url: string = (body?.url || '').trim();
        if (!url) {
            return NextResponse.json({ error: 'url 필요' }, { status: 400 });
        }
        try {
            new URL(url);
        } catch {
            return NextResponse.json({ error: '유효한 URL 이 아닙니다' }, { status: 400 });
        }

        const result = await scrapeProductPage(url);
        return NextResponse.json({
            ok: true,
            source: result.source,
            title: result.title,
            images: result.images,
        });
    } catch (e: any) {
        console.error('[/api/extract] error', e);
        return NextResponse.json(
            { error: e?.message || '추출 실패' },
            { status: 500 },
        );
    }
}
