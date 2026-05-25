/**
 * Prisma 7 CLI 설정. `npx prisma db push` 자동 인식.
 * 런타임 클라이언트 연결은 src/lib/prisma.ts 의 PrismaPg adapter.
 */

import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export default defineConfig({
    schema: './prisma/schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL!,
    },
});
