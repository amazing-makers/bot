/**
 * @amakers/db — 공유 Prisma 클라이언트 (전 봇 단일 인스턴스).
 *
 * 공유 Neon connection 한도 보호:
 *   - globalThis 캐시 (HMR/서버리스 중복 생성 방지)
 *   - pg.Pool max=1 (함수 인스턴스당 1 connection)
 *
 * ⚠️ 지연 초기화(lazy): 모듈 import 시점이 아니라 첫 쿼리 시점에 클라이언트 생성.
 *    Next.js 빌드(page-data 수집)에서 DATABASE_URL 없이 통과하도록 — 런타임에만 필요.
 *
 * 클라이언트는 packages/db/src/generated/client 에 생성(고정 output 경로 — 모노레포
 * hoisting 무관). `npm run db:generate` 또는 turbo `@amakers/db#generate` 로 생성.
 */

import { PrismaClient } from './generated/client';
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
    max: 1, // ⚠️ 공유 DB 한도 보호 — 늘리지 X
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
