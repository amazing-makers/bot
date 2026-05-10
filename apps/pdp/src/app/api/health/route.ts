/**
 * GET /api/health
 *
 * 운영 진단용 — env 변수 / DB 연결 / R2 연결 상태 확인.
 * 인증 X (admin 만 보면 좋지만, 민감 값 노출 X — 'set' / 'missing' 만).
 *
 * 응답 예:
 * {
 *   ok: true,
 *   env: { DATABASE_URL: 'set', NEXTAUTH_SECRET: 'set', ... },
 *   db: { ok: true, latencyMs: 23 },
 *   r2: { ok: true, configured: true },
 *   timestamp: '2026-...'
 * }
 *
 * 사용 방법:
 *   - 로컬: curl http://localhost:3200/api/health
 *   - 운영: curl https://pdpbot.amakers.co.kr/api/health
 *   - Vercel 배포 후 첫 검증 시 모든 env 가 'set' 인지 한눈에 확인.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isR2Configured } from '@/lib/storage/r2';

const REQUIRED_ENVS = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'API_KEY_ENCRYPTION_SECRET',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'REPLICATE_API_TOKEN',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
];

const OPTIONAL_ENVS = [
    'R2_PUBLIC_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
];

export async function GET() {
    const env: Record<string, 'set' | 'missing'> = {};
    const missing: string[] = [];

    for (const k of REQUIRED_ENVS) {
        const v = process.env[k];
        env[k] = v && v.length > 0 ? 'set' : 'missing';
        if (env[k] === 'missing') missing.push(k);
    }
    for (const k of OPTIONAL_ENVS) {
        const v = process.env[k];
        env[k] = v && v.length > 0 ? 'set' : 'missing';
    }

    // DB 연결 체크 (가벼운 SELECT 1)
    let db: { ok: boolean; latencyMs?: number; error?: string } = { ok: false };
    try {
        const t0 = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        db = { ok: true, latencyMs: Date.now() - t0 };
    } catch (e: any) {
        db = { ok: false, error: e?.message?.slice(0, 200) || 'DB 연결 실패' };
    }

    // R2 환경변수 형식 체크 (실제 호출은 하지 않음 — 비용·권한 이슈)
    const r2 = {
        configured: isR2Configured(),
        publicUrlSet: !!process.env.R2_PUBLIC_URL,
    };

    const ok = missing.length === 0 && db.ok && r2.configured;

    return NextResponse.json({
        ok,
        missing,
        env,
        db,
        r2,
        node: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
    }, {
        status: ok ? 200 : 503,
    });
}
