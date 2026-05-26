/**
 * Prisma client — naverblogauto 전용 (다른 봇과 같은 DB).
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

function getClient(): PrismaClient {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = createClient();
    }
    return globalForPrisma.prisma;
}

// 지연 프록시: 모듈 import 가 아니라 첫 사용(쿼리) 시점에 createClient() 호출.
// Next.js 빌드 page-data 수집 단계에서 DATABASE_URL 없이 통과 — 런타임에만 필요.
export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        const client = getClient();
        const value = (client as any)[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    },
});
