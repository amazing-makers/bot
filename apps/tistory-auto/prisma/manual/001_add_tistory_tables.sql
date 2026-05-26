-- tistory-auto 추가 전용 마이그레이션 (멱등·비파괴 — Tistory* 만 생성, 다른 앱 테이블 미변경)
--
-- 🚫 공유 DB 에 `prisma db push` 금지 (다른 앱 테이블 DROP 위험). 항상 이 파일을 db execute 로 적용:
--   cd apps/tistory-auto
--   npx prisma db execute --file ./prisma/manual/001_add_tistory_tables.sql
--   (datasource 는 prisma.config.ts → .env.local 의 DATABASE_URL. 운영 DB 면 백업 후.)

-- ===== Enums =====
DO $$ BEGIN CREATE TYPE "TistoryAccountStatus" AS ENUM ('ACTIVE', 'PENDING_AUTH', 'ERROR'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "TistoryPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'QUEUED', 'PUBLISHING', 'PUBLISHED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===== Tables =====
CREATE TABLE IF NOT EXISTS "TistoryAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "encryptedSecret" TEXT,
    "status" "TistoryAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TistoryAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TistoryPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "photoUrl" TEXT,
    "status" "TistoryPostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "remotePostId" TEXT,
    "link" TEXT,
    "error" TEXT,
    "creditsUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TistoryPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TistoryAgentToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TistoryAgentToken_pkey" PRIMARY KEY ("id")
);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS "TistoryAccount_userId_idx" ON "TistoryAccount"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TistoryAccount_userId_siteUrl_key" ON "TistoryAccount"("userId", "siteUrl");
CREATE INDEX IF NOT EXISTS "TistoryPost_userId_createdAt_idx" ON "TistoryPost"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TistoryPost_accountId_status_idx" ON "TistoryPost"("accountId", "status");
CREATE INDEX IF NOT EXISTS "TistoryPost_status_scheduledAt_idx" ON "TistoryPost"("status", "scheduledAt");
CREATE UNIQUE INDEX IF NOT EXISTS "TistoryAgentToken_token_key" ON "TistoryAgentToken"("token");
CREATE INDEX IF NOT EXISTS "TistoryAgentToken_userId_idx" ON "TistoryAgentToken"("userId");

-- ===== Foreign Keys (User 는 이미 존재) =====
DO $$ BEGIN
  ALTER TABLE "TistoryAccount" ADD CONSTRAINT "TistoryAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "TistoryPost" ADD CONSTRAINT "TistoryPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "TistoryPost" ADD CONSTRAINT "TistoryPost_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TistoryAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "TistoryAgentToken" ADD CONSTRAINT "TistoryAgentToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
