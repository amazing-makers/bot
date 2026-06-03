/**
 * 자동화 핸들러 레지스트리. 새 자동화 = 여기 핸들러 하나 등록하면 끝.
 * 엔진(run.ts)이 automation.type 으로 핸들러를 찾아 실행한다.
 */

import { generateBlogPost, deriveCaption } from '@amakers/ai';
import { prisma } from '@amakers/db';
import { generateImageHosted } from '@/lib/image-hosted';
import { publishForUser } from '@/lib/publish-core';
import { fetchFeedItems } from './rss';
import type { AutomationHandler, AutomationTypeMeta, RunResult, ScheduledPublishConfig } from './types';

type ProduceResult =
  | { ok: true; title: string; body: string; imageUrl?: string; caption?: string; configPatch?: any }
  | { ok: false; skip?: boolean; error: string };

/** 콘텐츠 소스 → 이번 회차 발행할 1건을 만든다. preview=true 면 부작용(소비/표시) 없이 조회만. */
async function produceContent(
  userId: string,
  cfg: ScheduledPublishConfig,
  needImage: boolean,
  preview = false,
): Promise<ProduceResult> {
  const src = cfg.source || ({ kind: 'ai' } as any);

  if (src.kind === 'ai') {
    if (!src.topic?.trim()) return { ok: false, error: 'AI 소스에 주제(topic)가 없습니다' };
    const post = await generateBlogPost(userId, { topic: src.topic, tone: src.tone, length: src.length });
    if (!post.ok) return { ok: false, error: post.error || 'AI 글 생성 실패' };
    let imageUrl: string | undefined;
    if (needImage || src.withImage) {
      const img = await generateImageHosted(userId, src.imagePrompt?.trim() || src.topic, 'square');
      if (img.ok) imageUrl = img.url;
      else if (needImage) return { ok: false, error: '이미지 생성 실패: ' + (img.error || '') };
    }
    return { ok: true, title: post.title || src.topic.slice(0, 60), body: post.markdown || '', imageUrl };
  }

  if (src.kind === 'rss') {
    if (!src.feedUrl?.trim()) return { ok: false, error: 'RSS 주소(feedUrl)가 없습니다' };
    let items;
    try {
      items = await fetchFeedItems(src.feedUrl.trim());
    } catch (e: any) {
      return { ok: false, error: e?.message || 'RSS 가져오기 실패' };
    }
    if (!items.length) return { ok: false, skip: true, error: '피드에 항목이 없습니다' };
    const newest = items[0];
    if (src.lastSeenGuid && newest.guid === src.lastSeenGuid) {
      return { ok: false, skip: true, error: '새 항목이 없습니다' };
    }
    let title = newest.title || '새 소식';
    let body = newest.summary || '';
    if (src.rewriteWithAI) {
      const post = await generateBlogPost(userId, {
        topic: `다음 글감을 SNS 게시용으로 자연스럽고 매력적으로 한국어 재작성:\n제목: ${newest.title}\n내용: ${(newest.summary || '').slice(0, 800)}`,
        length: 'short',
      });
      if (post.ok) {
        title = post.title || title;
        body = post.markdown || body;
      }
    }
    if (newest.link) body = `${body}\n\n원문: ${newest.link}`;
    let imageUrl: string | undefined;
    if (needImage) {
      const img = await generateImageHosted(userId, newest.title || title, 'square');
      if (img.ok) imageUrl = img.url;
      else return { ok: false, error: '이미지 생성 실패: ' + (img.error || '') };
    }
    return { ok: true, title, body, imageUrl, configPatch: { source: { ...src, lastSeenGuid: newest.guid } } };
  }

  if (src.kind === 'uploaded') {
    const items = Array.isArray(src.items) ? src.items : [];
    const cursor = Number.isInteger(src.cursor) ? (src.cursor as number) : 0;
    if (cursor >= items.length) return { ok: false, skip: true, error: '업로드한 항목을 모두 사용했습니다(소진)' };
    const it = items[cursor] || {};
    return {
      ok: true,
      title: (it.title || '').trim(),
      body: (it.body || '').trim(),
      imageUrl: (it.imageUrl || '').trim() || undefined,
      caption: (it.caption || '').trim() || undefined,
      configPatch: { source: { ...src, cursor: cursor + 1 } },
    };
  }

  if (src.kind === 'local') {
    // 데스크톱 에이전트가 올린 드롭 큐에서 가장 오래된 PENDING 1건 소비.
    const drop = await prisma.agentDropItem.findFirst({
      where: { userId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    if (!drop) return { ok: false, skip: true, error: '데스크톱에서 올라온 대기 항목이 없습니다' };
    if (!preview) await prisma.agentDropItem.update({ where: { id: drop.id }, data: { status: 'USED', usedAt: new Date() } });
    const cap = (drop.caption || '').trim();
    return { ok: true, title: cap || drop.source || '새 사진', body: cap, imageUrl: drop.imageUrl, caption: cap || undefined };
  }

  // drive — 확장 지점(추후 연동). 지금은 건너뜀.
  return { ok: false, skip: true, error: `'${src.kind}' 소스는 곧 지원됩니다(연동 준비중)` };
}

/** 스케줄 발행: 소스에서 1건 → 선택 채널에 발행. */
const scheduledPublish: AutomationHandler = async ({ userId, automation }): Promise<RunResult> => {
  const cfg = (automation.config || {}) as ScheduledPublishConfig;
  const ch = cfg.channels || {};
  const instaIds = ch.instaIds || [];
  const blogIds = ch.blogIds || [];
  const tistoryIds = ch.tistoryIds || [];
  if (instaIds.length + blogIds.length + tistoryIds.length === 0) {
    return { status: 'SKIPPED', summary: '발행 채널이 지정되지 않음' };
  }

  const needImage = instaIds.length > 0;
  const produced = await produceContent(userId, cfg, needImage);
  if (!produced.ok) {
    return produced.skip
      ? { status: 'SKIPPED', summary: produced.error }
      : { status: 'FAILED', error: produced.error };
  }

  const caption = produced.caption || deriveCaption(produced.title, produced.body);
  const result = await publishForUser(userId, {
    title: produced.title,
    body: produced.body,
    imageUrl: produced.imageUrl,
    instaCaption: caption,
    instaIds,
    blogIds,
    tistoryIds,
    publishNow: true,
  });

  if (!result.ok) return { status: 'FAILED', error: result.error, configPatch: produced.configPatch };

  const parts = [
    result.instagram ? `인스타 ${result.instagram}` : '',
    result.blog ? `블로그 ${result.blog}` : '',
    result.tistory ? `티스토리 ${result.tistory}` : '',
  ].filter(Boolean).join(' · ');
  return { status: 'SUCCESS', summary: `${produced.title || '발행'} → ${parts}`, configPatch: produced.configPatch };
};

export const HANDLERS: Record<string, AutomationHandler> = {
  scheduled_publish: scheduledPublish,
};

export interface PreviewResult {
  ok: boolean;
  title?: string;
  body?: string;
  imageUrl?: string;
  note?: string;
}

/** 발행 없이 "이번 회차에 무엇을 올릴지" 미리 만들어 본다(부작용 없음). */
export async function previewContent(userId: string, cfg: ScheduledPublishConfig): Promise<PreviewResult> {
  const ch = cfg.channels || {};
  const needImage = (ch.instaIds?.length || 0) > 0;
  const r = await produceContent(userId, cfg, needImage, true);
  if (!r.ok) return { ok: false, note: r.error };
  const caption = r.caption || deriveCaption(r.title, r.body);
  return { ok: true, title: r.title, body: r.body, imageUrl: r.imageUrl, note: caption !== r.body ? `인스타 캡션: ${caption.slice(0, 120)}` : undefined };
}

/** UI/AI 가 만들 수 있는 자동화 타입 목록. */
export const AUTOMATION_TYPES: AutomationTypeMeta[] = [
  {
    type: 'scheduled_publish',
    label: '예약 자동 발행',
    description: '정해진 주기/시각마다 소스(AI 생성·업로드 항목·RSS 피드)로 글·이미지를 만들어 선택 채널에 자동 발행',
  },
];
