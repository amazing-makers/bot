/**
 * Prisma client — blogbot 전용 (다른 봇과 같은 DB).
 *
 * 커스텀 output 으로 생성된 클라이언트를 직접 import (모노레포 hoisting 시 @prisma/client 가
 * 앱 로컬 .prisma/client 를 못 찾는 문제 회피).
 * Supabase connection 한도 보호: globalThis 캐시 + pg.Pool max=1.
 */

import { PrismaClient } from '.prisma/client';
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
        max: 1, // ⚠️ Supabase 한도 보호 — 절대 늘리지 X
    });
    const adapter = new PrismaPg(pool);

    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
