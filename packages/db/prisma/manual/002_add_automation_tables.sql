-- 자동화 엔진 테이블(공유 Neon 추가 적용). 멱등(IF NOT EXISTS). db push 대신 이 SQL 로만 적용.
CREATE TABLE IF NOT EXISTS "Automation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "scheduleKind" TEXT NOT NULL DEFAULT 'interval',
  "intervalMinutes" INTEGER,
  "cronExpr" TEXT,
  "config" JSONB NOT NULL,
  "nextRunAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "lastStatus" TEXT,
  "lastError" TEXT,
  "runCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Automation_status_nextRunAt_idx" ON "Automation" ("status", "nextRunAt");
CREATE INDEX IF NOT EXISTS "Automation_userId_idx" ON "Automation" ("userId");

CREATE TABLE IF NOT EXISTS "AutomationRun" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AutomationRun_automationId_idx" ON "AutomationRun" ("automationId");
CREATE INDEX IF NOT EXISTS "AutomationRun_userId_idx" ON "AutomationRun" ("userId");
