-- instabot 추가 전용 마이그레이션 (안전: 신규 객체만 생성, 운영 공유 테이블 미변경)
--
-- ⚠️ 공유 Supabase 에 `prisma db push` 를 쓰면 instabot 의 최소 User 스키마와 운영 User 테이블의
--    차이를 Prisma 가 "삭제"로 판단해 컬럼을 DROP 할 위험이 있음. 그래서 db push 대신 이 파일을 적용.
--
-- 적용:
--   cd apps/instagram
--   npx prisma db execute --file ./prisma/manual/001_add_instagram_tables.sql --schema ./prisma/schema.prisma
--
-- 멱등(idempotent): 이미 존재하면 건너뜀 → 여러 번 실행해도 안전.

-- ===== Enums =====
DO $$ BEGIN
  CREATE TYPE "InstagramAccountStatus" AS ENUM ('ACTIVE', 'PENDING_AUTH', 'ERROR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InstagramPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "InstagramMediaType" AS ENUM ('IMAGE', 'REELS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ===== Tables =====
CREATE TABLE IF NOT EXISTS "InstagramAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "igUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "followers" INTEGER,
    "encryptedAccessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "status" "InstagramAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InstagramPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "mediaType" "InstagramMediaType" NOT NULL DEFAULT 'IMAGE',
    "status" "InstagramPostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "mediaId" TEXT,
    "permalink" TEXT,
    "error" TEXT,
    "creditsUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS "InstagramAccount_userId_idx" ON "InstagramAccount"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "InstagramAccount_userId_igUserId_key" ON "InstagramAccount"("userId", "igUserId");
CREATE INDEX IF NOT EXISTS "InstagramPost_userId_createdAt_idx" ON "InstagramPost"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "InstagramPost_accountId_status_idx" ON "InstagramPost"("accountId", "status");
CREATE INDEX IF NOT EXISTS "InstagramPost_status_scheduledAt_idx" ON "InstagramPost"("status", "scheduledAt");

-- ===== Foreign Keys (참조 대상 User 는 이미 존재) =====
DO $$ BEGIN
  ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "InstagramPost" ADD CONSTRAINT "InstagramPost_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
