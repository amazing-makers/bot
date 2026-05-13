/**
 * designbot middleware.
 *
 * 역할:
 * 1. CORS — pdpbot (NEXT_PUBLIC_PDPBOT_URL) 에서 /api/designs/from-product 를
 *    cross-origin 으로 호출할 수 있도록 허용.
 *    Same-domain (SSO cookie 도메인 .amakers.co.kr) 이면 사실상 필요 없지만,
 *    로컬 개발 (다른 포트) 에서 필요.
 *
 * 2. NextAuth 세션 검사는 각 API route 에서 직접 처리 (middleware 에서는 X — Edge runtime 지원 이슈).
 */

import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = [
    'http://localhost:3200',          // pdpbot 로컬
    'http://localhost:3000',          // marketingbot 로컬
    process.env.NEXT_PUBLIC_PDPBOT_URL,
    process.env.NEXT_PUBLIC_MARKETINGBOT_URL,
    'https://pdp.amakers.co.kr',
    'https://amakers.co.kr',
    'https://www.amakers.co.kr',
].filter(Boolean) as string[];

function corsHeaders(origin: string | null) {
    const allowed = origin && ALLOWED_ORIGINS.some(o => o === origin);
    return {
        'Access-Control-Allow-Origin': allowed ? origin! : '',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
    };
}

export function middleware(req: NextRequest) {
    const origin = req.headers.get('origin');
    const { pathname } = req.nextUrl;

    // CORS preflight
    if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        return new NextResponse(null, {
            status: 204,
            headers: corsHeaders(origin),
        });
    }

    // 크로스봇 API 경로에 CORS 헤더 추가
    if (pathname.startsWith('/api/designs/from-product') || pathname.startsWith('/api/templates')) {
        const res = NextResponse.next();
        const headers = corsHeaders(origin);
        Object.entries(headers).forEach(([k, v]) => {
            if (v) res.headers.set(k, v);
        });
        return res;
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
