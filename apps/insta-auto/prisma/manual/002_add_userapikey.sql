-- insta-auto 추가: UserApiKey (BYOK AI 키 저장) — 멱등·비파괴
-- 적용: npx prisma db execute --file ./prisma/manual/002_add_userapikey.sql

CREATE TABLE IF NOT EXISTS "UserApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "maskedHint" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserApiKey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserApiKey_userId_idx" ON "UserApiKey"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserApiKey_userId_provider_key" ON "UserApiKey"("userId", "provider");

DO $$ BEGIN
  ALTER TABLE "UserApiKey" ADD CONSTRAINT "UserApiKey_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
