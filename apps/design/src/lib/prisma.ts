/**
 * Prisma client — pdpbot 전용 (마케팅봇과 같은 DB).
 *
 * Supabase Free 플랜 connection 한도 (15) 보호:
 *   - globalThis 캐시 (HMR 환경에서 prisma client 중복 생성 방지)
 *   - pg.Pool max=1 (서버리스 함수 1 인스턴스당 1 connection)
 *   - 모든 봇이 같은 한도 공유 — 마케팅봇 + adminbot + pdpbot 합쳐 15 connection 안에서 안정 동작.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

function createClient(): PrismaClient {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다');

    const pool = new pg.Pool({
        connectionString: url,
        max: 1, // ⚠️ Supabase 한도 (15) 보호 — 절대 늘리지 X
    });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
