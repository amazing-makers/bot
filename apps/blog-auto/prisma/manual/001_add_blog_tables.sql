-- blog-auto 추가 전용 마이그레이션 (멱등·비파괴 — Blog* 만 생성, 다른 앱 테이블 미변경)
--
-- 🚫 공유 DB 에 `prisma db push` 금지 (다른 앱 테이블 DROP 위험). 항상 이 파일을 db execute 로 적용:
--   cd apps/blog-auto
--   npx prisma db execute --file ./prisma/manual/001_add_blog_tables.sql
--   (datasource 는 prisma.config.ts → .env.local 의 DATABASE_URL. 운영 DB 면 백업 후.)

-- ===== Enums =====
DO $$ BEGIN CREATE TYPE "BlogProvider" AS ENUM ('WORDPRESS', 'NAVER'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "BlogAccountStatus" AS ENUM ('ACTIVE', 'PENDING_AUTH', 'ERROR'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===== Tables =====
CREATE TABLE IF NOT EXISTS "BlogAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "BlogProvider" NOT NULL DEFAULT 'WORDPRESS',
    "siteUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "status" "BlogAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BlogAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BlogPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "photoUrl" TEXT,
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "remotePostId" TEXT,
    "link" TEXT,
    "error" TEXT,
    "creditsUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- ===== 신규 컬럼 (idempotent) =====
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BlogPost" ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS "BlogAccount_userId_idx" ON "BlogAccount"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "BlogAccount_userId_provider_siteUrl_key" ON "BlogAccount"("userId", "provider", "siteUrl");
CREATE INDEX IF NOT EXISTS "BlogPost_userId_createdAt_idx" ON "BlogPost"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "BlogPost_accountId_status_idx" ON "BlogPost"("accountId", "status");
CREATE INDEX IF NOT EXISTS "BlogPost_status_scheduledAt_idx" ON "BlogPost"("status", "scheduledAt");

-- ===== Foreign Keys (User 는 이미 존재) =====
DO $$ BEGIN
  ALTER TABLE "BlogAccount" ADD CONSTRAINT "BlogAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BlogAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
