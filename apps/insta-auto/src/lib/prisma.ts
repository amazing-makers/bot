/**
 * Prisma client — instaauto 전용 (다른 봇과 같은 DB).
 *
 * Supabase Free 플랜 connection 한도 (15) 보호:
 *   - globalThis 캐시 (HMR 중복 생성 방지)
 *   - pg.Pool max=1 (서버리스 함수 1 인스턴스당 1 connection)
 *   - 모든 봇이 같은 한도 공유.
 *
 * ⚠️ 지연 초기화(lazy): 모듈 import 시점이 아니라 첫 사용(쿼리) 시점에 클라이언트 생성.
 *    Next.js 빌드의 page-data 수집 단계에서 DATABASE_URL 없이도 통과하도록 — 런타임에만 필요.
 */

// 커스텀 output(generator output = ../node_modules/.prisma/client) 으로 생성된 클라이언트를 직접 import.
// 모노레포에서 @prisma/client 가 루트로 hoist 되면 앱 로컬 .prisma/client 를 못 찾으므로 직접 경로 사용.
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
        max: 1, // ⚠️ Supabase 한도 (15) 보호 — 절대 늘리지 X
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

// 지연 프록시: 실제 접근(prisma.user.findMany 등) 시점에만 createClient() 호출.
export const prisma = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        const client = getClient();
        const value = (client as any)[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    },
});
