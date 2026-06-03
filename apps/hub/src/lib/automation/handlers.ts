/**
 * 자동화 핸들러 레지스트리. 새 자동화 = 여기 핸들러 하나 등록하면 끝.
 * 엔진(run.ts)이 automation.type 으로 핸들러를 찾아 실행한다.
 */

import { generateBlogPost, generateImage, deriveCaption } from '@amakers/ai';
import { publishForUser } from '@/lib/publish-core';
import type { AutomationHandler, AutomationTypeMeta, RunResult, ScheduledPublishConfig } from './types';

/** 콘텐츠 소스 → 이번 회차 발행할 1건을 만든다. 확장 지점(드라이브/로컬 등). */
async function produceContent(
  userId: string,
  cfg: ScheduledPublishConfig,
  needImage: boolean,
): Promise<{ ok: true; title: string; body: string; imageUrl?: string; caption?: string; configPatch?: any } | { ok: false; skip?: boolean; error: string }> {
  const src = cfg.source || ({ kind: 'ai' } as any);

  if (src.kind === 'ai') {
    if (!src.topic?.trim()) return { ok: false, error: 'AI 소스에 주제(topic)가 없습니다' };
    const post = await generateBlogPost(userId, { topic: src.topic, tone: src.tone, length: src.length });
    if (!post.ok) return { ok: false, error: post.error || 'AI 글 생성 실패' };
    let imageUrl: string | undefined;
    if (needImage || src.withImage) {
      const img = await generateImage(src.imagePrompt?.trim() || src.topic, 'square');
      if (img.ok) imageUrl = img.url;
      else if (needImage) return { ok: false, error: '이미지 생성 실패: ' + (img.error || '') };
    }
    return { ok: true, title: post.title || src.topic.slice(0, 60), body: post.markdown || '', imageUrl };
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

  // drive / local — 확장 지점(추후 연동). 지금은 건너뜀.
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

/** UI/AI 가 만들 수 있는 자동화 타입 목록. */
export const AUTOMATION_TYPES: AutomationTypeMeta[] = [
  {
    type: 'scheduled_publish',
    label: '예약 자동 발행',
    description: '정해진 주기마다 소스(AI 생성/업로드 등)로 글·이미지를 만들어 선택한 채널에 자동 발행',
  },
];
