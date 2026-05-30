/**
 * Prisma 7 CLI 설정 (generate / db pull / migrate diff).
 *
 * datasource.url 은 환경변수에서. CLI 실행 시 DATABASE_URL 을 주입:
 *   - 로컬: 아래 dotenv 가 가까운 .env 들을 로드(있으면).
 *   - 검증/introspect: `DATABASE_URL=<direct URL> npx prisma db pull` 처럼 직접 주입.
 *
 * ⚠️ 공유 Neon 에 `prisma db push`/`migrate` 절대 금지 — 다른 앱 테이블 DROP 위험.
 *    스키마 변경 검증은 `prisma migrate diff --from-config-datasource --to-schema ./prisma/schema.prisma --script`
 *    결과가 비어야 함(DB 일치).
 */

import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

// 있으면 로드(없어도 무방 — env 로 직접 주입 가능). 기존 env 는 덮어쓰지 않음.
dotenv.config({ path: '.env.local' });
dotenv.config();

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
