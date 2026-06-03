-- 데스크톱 에이전트 드롭 큐(공유 Neon 추가 적용). 멱등.
CREATE TABLE IF NOT EXISTS "AgentDropItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "caption" TEXT,
  "source" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "AgentDropItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AgentDropItem_userId_status_idx" ON "AgentDropItem" ("userId", "status");
