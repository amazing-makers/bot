'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@amakers/db';
import { runAutomationById, computeNext } from '@/lib/automation/run';
import { AUTOMATION_TYPES } from '@/lib/automation/handlers';
import type { ScheduledPublishConfig } from '@/lib/automation/types';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) throw new Error('로그인이 필요합니다');
  return userId;
}

export interface CreateAutomationInput {
  name: string;
  type?: string; // 기본 scheduled_publish
  scheduleKind?: 'interval' | 'daily'; // 기본 interval
  intervalMinutes?: number; // interval 일 때
  dailyTime?: string; // daily 일 때 "HH:MM" (KST)
  config: ScheduledPublishConfig;
  startNow?: boolean;
}

export interface AutomationListItem {
  id: string;
  name: string;
  type: string;
  status: string;
  scheduleKind: string;
  intervalMinutes: number | null;
  dailyTime: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  runCount: number;
  config: any;
}

export interface AutomationRunItem {
  id: string;
  status: string;
  summary: string | null;
  error: string | null;
  startedAt: string;
}

function validateChannels(cfg: ScheduledPublishConfig): string | null {
  const ch = cfg?.channels || ({} as any);
  const total = (ch.instaIds?.length || 0) + (ch.blogIds?.length || 0) + (ch.tistoryIds?.length || 0);
  if (total === 0) return '발행할 채널을 1개 이상 선택하세요';
  if (cfg?.source?.kind === 'ai' && !cfg.source.topic?.trim()) return 'AI 소스에는 주제가 필요합니다';
  if (cfg?.source?.kind === 'rss' && !cfg.source.feedUrl?.trim()) return 'RSS 소스에는 피드 주소가 필요합니다';
  if (cfg?.source?.kind === 'uploaded' && !(cfg.source.items && cfg.source.items.length)) return '업로드 항목을 1개 이상 추가하세요';
  return null;
}

export async function createAutomation(input: CreateAutomationInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const userId = await requireUserId();
  const name = (input.name || '').trim();
  if (!name) return { ok: false, error: '이름을 입력하세요' };

  const scheduleKind = input.scheduleKind === 'daily' ? 'daily' : 'interval';
  let interval = 0;
  let dailyTime: string | null = null;
  if (scheduleKind === 'daily') {
    const m = /^(\d{1,2}):(\d{2})$/.exec((input.dailyTime || '').trim());
    if (!m) return { ok: false, error: '매일 실행할 시각을 HH:MM 형식으로 입력하세요' };
    const hh = Math.min(23, parseInt(m[1], 10));
    const mm = Math.min(59, parseInt(m[2], 10));
    dailyTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  } else {
    interval = Math.max(5, Math.floor(input.intervalMinutes || 0));
    if (!interval) return { ok: false, error: '실행 주기를 입력하세요(분)' };
  }

  const type = input.type || 'scheduled_publish';
  if (!AUTOMATION_TYPES.some((t) => t.type === type)) return { ok: false, error: '지원하지 않는 자동화 유형입니다' };

  const err = validateChannels(input.config);
  if (err) return { ok: false, error: err };

  // 채널 소유 검증
  const ch = input.config.channels;
  const [insta, blog, tistory] = await Promise.all([
    ch.instaIds?.length ? prisma.instagramAccount.findMany({ where: { id: { in: ch.instaIds }, userId }, select: { id: true } }) : [],
    ch.blogIds?.length ? prisma.blogAccount.findMany({ where: { id: { in: ch.blogIds }, userId }, select: { id: true } }) : [],
    ch.tistoryIds?.length ? prisma.tistoryAccount.findMany({ where: { id: { in: ch.tistoryIds }, userId }, select: { id: true } }) : [],
  ]);
  const config: ScheduledPublishConfig = {
    ...input.config,
    channels: { instaIds: insta.map((a) => a.id), blogIds: blog.map((a) => a.id), tistoryIds: tistory.map((a) => a.id) },
  };
  if ((config.channels.instaIds!.length + config.channels.blogIds!.length + config.channels.tistoryIds!.length) === 0) {
    return { ok: false, error: '본인 계정인 채널이 없습니다' };
  }

  const now = new Date();
  const scheduled = computeNext(now, { scheduleKind, intervalMinutes: interval || null, cronExpr: dailyTime });
  const nextRunAt = input.startNow ? now : scheduled;

  const created = await prisma.automation.create({
    data: {
      userId,
      name,
      type,
      status: 'ACTIVE',
      scheduleKind,
      intervalMinutes: scheduleKind === 'interval' ? interval : null,
      cronExpr: dailyTime,
      config: config as any,
      nextRunAt,
    },
    select: { id: true },
  });
  revalidatePath('/automations');
  return { ok: true, id: created.id };
}

export async function listAutomations(): Promise<AutomationListItem[]> {
  const userId = await requireUserId();
  const rows = await prisma.automation.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  return rows.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    status: a.status,
    scheduleKind: a.scheduleKind,
    intervalMinutes: a.intervalMinutes,
    dailyTime: a.scheduleKind === 'daily' ? a.cronExpr : null,
    nextRunAt: a.nextRunAt ? a.nextRunAt.toISOString() : null,
    lastRunAt: a.lastRunAt ? a.lastRunAt.toISOString() : null,
    lastStatus: a.lastStatus,
    lastError: a.lastError,
    runCount: a.runCount,
    config: a.config,
  }));
}

/** 한 자동화의 최근 실행 이력. */
export async function getAutomationRuns(automationId: string, limit = 20): Promise<AutomationRunItem[]> {
  const userId = await requireUserId();
  const owned = await prisma.automation.findFirst({ where: { id: automationId, userId }, select: { id: true } });
  if (!owned) return [];
  const runs = await prisma.automationRun.findMany({
    where: { automationId, userId },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
  return runs.map((r) => ({
    id: r.id,
    status: r.status,
    summary: r.summary,
    error: r.error,
    startedAt: r.startedAt.toISOString(),
  }));
}

export async function setAutomationPaused(id: string, paused: boolean): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  const owned = await prisma.automation.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return { ok: false, error: '자동화를 찾을 수 없습니다' };
  await prisma.automation.update({ where: { id }, data: { status: paused ? 'PAUSED' : 'ACTIVE' } });
  revalidatePath('/automations');
  return { ok: true };
}

export async function deleteAutomation(id: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await requireUserId();
  const owned = await prisma.automation.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return { ok: false, error: '자동화를 찾을 수 없습니다' };
  await prisma.automationRun.deleteMany({ where: { automationId: id } });
  await prisma.automation.delete({ where: { id } });
  revalidatePath('/automations');
  return { ok: true };
}

export async function runAutomationNow(id: string): Promise<{ ok: boolean; status?: string; note?: string; error?: string }> {
  const userId = await requireUserId();
  const r = await runAutomationById(id, userId);
  revalidatePath('/automations');
  return { ok: r.status !== 'FAILED', status: r.status, note: r.summary, error: r.error };
}
