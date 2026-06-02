/**
 * 자동화 실행 엔진. cron 이 주기적으로 runDueAutomations() 호출.
 * 마감(nextRunAt<=now)된 ACTIVE 자동화를 찾아 핸들러 실행 → 로그 + 다음 실행시각 계산.
 */

import { prisma } from '@amakers/db';
import { HANDLERS } from './handlers';
import type { AutomationRecord, RunResult } from './types';

/** 다음 실행 시각 계산. interval=주기, once=종료(null), cron=후속(주기 기본값). */
function computeNext(now: Date, a: AutomationRecord): Date | null {
  if (a.scheduleKind === 'once') return null;
  const minutes = a.intervalMinutes && a.intervalMinutes > 0 ? a.intervalMinutes : 180;
  return new Date(now.getTime() + minutes * 60_000);
}

/** 한 자동화를 실행하고 결과를 DB(자동화 상태 + 실행로그)에 반영한다. */
async function processOne(a: AutomationRecord, now: Date): Promise<RunResult> {
  const handler = HANDLERS[a.type];
  let result: RunResult;
  if (!handler) {
    result = { status: 'SKIPPED', summary: `알 수 없는 자동화 type: ${a.type}` };
  } else {
    try {
      result = await handler({ userId: a.userId, automation: a });
    } catch (e: any) {
      result = { status: 'FAILED', error: e?.message || '핸들러 오류' };
    }
  }

  const onceDone = a.scheduleKind === 'once' && result.status !== 'SKIPPED';
  const next = onceDone ? null : computeNext(now, a);
  const mergedConfig = result.configPatch ? { ...(a.config || {}), ...result.configPatch } : undefined;

  await prisma.automation.update({
    where: { id: a.id },
    data: {
      lastRunAt: now,
      lastStatus: result.status,
      lastError: result.error || null,
      runCount: { increment: 1 },
      nextRunAt: onceDone ? null : next,
      status: onceDone ? 'PAUSED' : undefined,
      ...(mergedConfig ? { config: mergedConfig } : {}),
    },
  });

  await prisma.automationRun.create({
    data: {
      automationId: a.id,
      userId: a.userId,
      status: result.status,
      summary: result.summary || null,
      error: result.error || null,
      finishedAt: new Date(),
    },
  });

  return result;
}

export interface RunSummary {
  processed: number;
  success: number;
  failed: number;
  skipped: number;
  details: Array<{ id: string; name: string; status: string; note?: string }>;
}

/** 한 번 호출 = 마감된 자동화들을 처리. limit 로 한 회차 처리량 제한. */
export async function runDueAutomations(limit = 20): Promise<RunSummary> {
  const now = new Date();
  const due = await prisma.automation.findMany({
    where: { status: 'ACTIVE', OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    orderBy: { nextRunAt: 'asc' },
    take: limit,
  });

  const summary: RunSummary = { processed: 0, success: 0, failed: 0, skipped: 0, details: [] };
  for (const row of due) {
    const a = row as unknown as AutomationRecord;
    const result = await processOne(a, now);
    summary.processed++;
    if (result.status === 'SUCCESS') summary.success++;
    else if (result.status === 'FAILED') summary.failed++;
    else summary.skipped++;
    summary.details.push({ id: a.id, name: a.name, status: result.status, note: result.summary || result.error });
  }
  return summary;
}

/** 단건 즉시 실행(소유자 검증 포함). "지금 실행" 버튼용. */
export async function runAutomationById(id: string, userId: string): Promise<RunResult> {
  const row = await prisma.automation.findFirst({ where: { id, userId } });
  if (!row) return { status: 'FAILED', error: '자동화를 찾을 수 없습니다' };
  return processOne(row as unknown as AutomationRecord, new Date());
}
