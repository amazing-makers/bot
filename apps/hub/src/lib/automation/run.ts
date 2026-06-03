/**
 * 자동화 실행 엔진. cron 이 주기적으로 runDueAutomations() 호출.
 * - 동시성 락: 마감 자동화를 "선점(nextRunAt 전진)" 후 실행 → cron 틱 겹쳐도 중복 실행 방지.
 * - 스케줄: interval(주기 분) / daily(KST 정시 HH:MM, cronExpr에 저장) / once(1회).
 */

import { prisma } from '@amakers/db';
import { HANDLERS } from './handlers';
import type { AutomationRecord, RunResult } from './types';

const KST_OFFSET_MIN = 9 * 60;

/** 다음 실행 시각 계산. */
export function computeNext(now: Date, a: Pick<AutomationRecord, 'scheduleKind' | 'intervalMinutes' | 'cronExpr'>): Date | null {
  if (a.scheduleKind === 'once') return null;

  if (a.scheduleKind === 'daily') {
    // cronExpr = "HH:MM" (KST 기준). 다음 도래 시각(UTC)을 계산.
    const m = /^(\d{1,2}):(\d{2})$/.exec((a.cronExpr || '').trim());
    const hh = m ? Math.min(23, parseInt(m[1], 10)) : 9;
    const mm = m ? Math.min(59, parseInt(m[2], 10)) : 0;
    // now 를 KST 분단위로 환산
    const nowKstMs = now.getTime() + KST_OFFSET_MIN * 60_000;
    const kst = new Date(nowKstMs);
    const target = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), hh, mm, 0));
    let targetMs = target.getTime();
    if (targetMs <= nowKstMs) targetMs += 24 * 60 * 60_000; // 오늘 시각 지났으면 내일
    return new Date(targetMs - KST_OFFSET_MIN * 60_000); // KST→UTC
  }

  // interval
  const minutes = a.intervalMinutes && a.intervalMinutes > 0 ? a.intervalMinutes : 180;
  return new Date(now.getTime() + minutes * 60_000);
}

/** 핸들러 실행 + 결과 로그/상태 기록(스케줄 nextRunAt 은 건드리지 않음). */
async function executeAndLog(a: AutomationRecord, now: Date): Promise<RunResult> {
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

  const mergedConfig = result.configPatch ? { ...(a.config || {}), ...result.configPatch } : undefined;
  await prisma.automation.update({
    where: { id: a.id },
    data: {
      lastRunAt: now,
      lastStatus: result.status,
      lastError: result.error || null,
      runCount: { increment: 1 },
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

/** 마감된 자동화들을 처리(동시성 락 포함). limit 로 한 회차 처리량 제한. */
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
    const tentativeNext = computeNext(now, a);

    // 선점(락): 아직 마감 상태일 때만 nextRunAt 를 전진. 0건이면 다른 틱이 이미 처리 → skip.
    const claim = await prisma.automation.updateMany({
      where: { id: a.id, status: 'ACTIVE', OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
      data: { nextRunAt: tentativeNext },
    });
    if (claim.count === 0) continue;

    const result = await executeAndLog(a, now);

    // once 는 실행 후 종료(일시정지). 그 외엔 위에서 전진한 nextRunAt 유지.
    if (a.scheduleKind === 'once' && result.status !== 'SKIPPED') {
      await prisma.automation.update({ where: { id: a.id }, data: { nextRunAt: null, status: 'PAUSED' } });
    }

    summary.processed++;
    if (result.status === 'SUCCESS') summary.success++;
    else if (result.status === 'FAILED') summary.failed++;
    else summary.skipped++;
    summary.details.push({ id: a.id, name: a.name, status: result.status, note: result.summary || result.error });
  }

  return summary;
}

/** 단건 즉시 실행(소유자 검증). "지금 실행" 버튼용 — 스케줄(nextRunAt)은 유지. */
export async function runAutomationById(id: string, userId: string): Promise<RunResult> {
  const row = await prisma.automation.findFirst({ where: { id, userId } });
  if (!row) return { status: 'FAILED', error: '자동화를 찾을 수 없습니다' };
  return executeAndLog(row as unknown as AutomationRecord, new Date());
}
