'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@amakers/db';
import { runAutomationById } from '@/lib/automation/run';
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
  intervalMinutes: number;
  config: ScheduledPublishConfig;
  startNow?: boolean;
}

export interface AutomationListItem {
  id: string;
  name: string;
  type: string;
  status: string;
  intervalMinutes: number | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  runCount: number;
  config: any;
}

function validateChannels(cfg: ScheduledPublishConfig): string | null {
  const ch = cfg?.channels || ({} as any);
  const total = (ch.instaIds?.length || 0) + (ch.blogIds?.length || 0) + (ch.tistoryIds?.length || 0);
  if (total === 0) return '발행할 채널을 1개 이상 선택하세요';
  if (cfg?.source?.kind === 'ai' && !cfg.source.topic?.trim()) return 'AI 소스에는 주제가 필요합니다';
  return null;
}

export async function createAutomation(input: CreateAutomationInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const userId = await requireUserId();
  const name = (input.name || '').trim();
  if (!name) return { ok: false, error: '이름을 입력하세요' };
  const interval = Math.max(5, Math.floor(input.intervalMinutes || 0));
  if (!interval) return { ok: false, error: '실행 주기를 입력하세요(분)' };

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
  const nextRunAt = input.startNow ? now : new Date(now.getTime() + interval * 60_000);

  const created = await prisma.automation.create({
    data: {
      userId,
      name,
      type,
      status: 'ACTIVE',
      scheduleKind: 'interval',
      intervalMinutes: interval,
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
    intervalMinutes: a.intervalMinutes,
    nextRunAt: a.nextRunAt ? a.nextRunAt.toISOString() : null,
    lastRunAt: a.lastRunAt ? a.lastRunAt.toISOString() : null,
    lastStatus: a.lastStatus,
    lastError: a.lastError,
    runCount: a.runCount,
    config: a.config,
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
