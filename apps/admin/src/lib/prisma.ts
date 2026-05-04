import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

declare global {
    // eslint-disable-next-line no-var
    var __adminPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter, log: ['warn', 'error'] });
}

export const prisma: PrismaClient = globalThis.__adminPrisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
    globalThis.__adminPrisma = prisma;
}
