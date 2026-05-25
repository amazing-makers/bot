/**
 * Prisma 7 CLI 설정 파일.
 *
 * migrate dev / db push 등 CLI 툴은 schema 내 `url = env(...)` 를 더이상 지원하지 않음.
 * 대신 이 파일에서 datasource.url 을 설정.
 *
 * 사용: `npx prisma db push` (prisma.config.ts 자동 인식)
 *
 * 런타임 클라이언트 연결은 src/lib/prisma.ts 의 PrismaPg adapter 로 별도 처리.
 */

import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

// 로컬 개발 시 .env.local 로드 (Vercel/CI 에서는 환경변수 직접 주입)
dotenv.config({ path: '.env.local' });

export default defineConfig({
    schema: './prisma/schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL!,
    },
});
