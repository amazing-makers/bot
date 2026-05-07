import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

declare global {
    // eslint-disable-next-line no-var
    var __adminPrisma: PrismaClient | undefined;
    // eslint-disable-next-line no-var
    var __adminPgPool: pg.Pool | undefined;
}

function createClient(): PrismaClient {
    const pool =
        globalThis.__adminPgPool ??
        new pg.Pool({
            connectionString: process.env.DATABASE_URL,
            max: 5, // serverless: lambda 당 풀 작게 유지 (Supabase pooler 한도 보호)
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 10_000,
        });

    if (!globalThis.__adminPgPool) {
        globalThis.__adminPgPool = pool;
    }

    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: ['warn', 'error'] });
}

// production 에서도 lambda 재사용 시 캐시 (cold start 비용 절약)
export const prisma: PrismaClient = globalThis.__adminPrisma ?? createClient();

if (!globalThis.__adminPrisma) {
    globalThis.__adminPrisma = prisma;
}
