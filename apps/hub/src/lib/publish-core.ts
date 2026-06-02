/**
 * 발행 코어 — userId 를 직접 받아 다채널 발행한다(세션 비의존).
 * 서버액션(multi-publish.ts)과 자동화 cron 핸들러가 공용으로 사용.
 */

import { prisma } from '@amakers/db';
import { deriveCaption } from '@amakers/ai';
import { BOT_TOOLS } from '@amakers/types';

export interface PublishToChannelsInput {
  title: string;
  body: string; // 마크다운
  imageUrl?: string;
  instaCaption?: string;
  instaIds: string[];
  blogIds: string[];
  tistoryIds: string[];
  publishNow?: boolean;
  scheduledAt?: string;
}

export interface PublishResult {
  ok: boolean;
  error?: string;
  instagram?: number;
  blog?: number;
  tistory?: number;
  publishNow?: boolean;
}

function botUrl(id: string): string | undefined {
  return BOT_TOOLS.find((t) => t.id === id)?.url;
}

/** 생성 직후 해당 봇 발행 cron 즉시 트리거(거의 즉시 발행). 실패해도 5분 cron 이 보강. */
async function triggerCron(botId: string): Promise<void> {
  const base = botUrl(botId);
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return;
  try {
    await fetch(`${base}/api/cron/dispatch-scheduled`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // 무시 — 다음 정기 cron 이 처리
  }
}

/** 한 번 작성 → 선택한 인스타/블로그/티스토리 계정에 동시 발행(자동 적응). userId 직접 주입. */
export async function publishForUser(userId: string, input: PublishToChannelsInput): Promise<PublishResult> {
  const title = (input.title || '').trim();
  const body = (input.body || '').trim();
  const imageUrl = (input.imageUrl || '').trim() || null;
  const instaIds = [...new Set((input.instaIds || []).filter(Boolean))];
  const blogIds = [...new Set((input.blogIds || []).filter(Boolean))];
  const tistoryIds = [...new Set((input.tistoryIds || []).filter(Boolean))];

  if (instaIds.length + blogIds.length + tistoryIds.length === 0) {
    return { ok: false, error: '발행할 채널을 1개 이상 선택하세요' };
  }
  if ((blogIds.length || tistoryIds.length) && (!title || !body)) {
    return { ok: false, error: '블로그·티스토리는 제목과 본문이 필요합니다' };
  }
  if (instaIds.length && !imageUrl) {
    return { ok: false, error: '인스타에 발행하려면 이미지가 필요합니다' };
  }

  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  const isNow = !!input.publishNow && !scheduledAt;
  const dispatchAt = scheduledAt ?? new Date();

  const summary = { instagram: 0, blog: 0, tistory: 0 };

  if (instaIds.length) {
    const owned = await prisma.instagramAccount.findMany({ where: { id: { in: instaIds }, userId }, select: { id: true } });
    const caption = (input.instaCaption || '').trim() || deriveCaption(title, body);
    if (!caption) return { ok: false, error: '인스타 캡션 내용이 필요합니다' };
    for (const a of owned) {
      await prisma.instagramPost.create({
        data: { userId, accountId: a.id, caption, imageUrl, mediaType: 'IMAGE', status: 'SCHEDULED', scheduledAt: dispatchAt },
      });
      summary.instagram++;
    }
  }

  if (blogIds.length) {
    const owned = await prisma.blogAccount.findMany({ where: { id: { in: blogIds }, userId }, select: { id: true } });
    for (const a of owned) {
      await prisma.blogPost.create({
        data: { userId, accountId: a.id, title, content: body, photoUrl: imageUrl, status: 'SCHEDULED', scheduledAt: dispatchAt },
      });
      summary.blog++;
    }
  }

  if (tistoryIds.length) {
    const owned = await prisma.tistoryAccount.findMany({ where: { id: { in: tistoryIds }, userId }, select: { id: true } });
    for (const a of owned) {
      await prisma.tistoryPost.create({
        data: {
          userId, accountId: a.id, title, content: body, photoUrl: imageUrl,
          status: isNow ? 'QUEUED' : 'SCHEDULED',
          scheduledAt,
        },
      });
      summary.tistory++;
    }
  }

  if (isNow) {
    if (summary.instagram) await triggerCron('instaauto');
    if (summary.blog) await triggerCron('naverblogauto');
    // 티스토리는 QUEUED → 데스크톱 에이전트가 처리
  }

  return { ok: true, ...summary, publishNow: isNow };
}
