'use server';

import { auth } from '@/auth';
import { prisma } from '@amakers/db';
import { runAgent, generateBlogPost, generateImage, type AgentToolDef } from '@amakers/ai';
import { publishToChannels, type PublishToChannelsInput, type PublishResult } from './multi-publish';
import { createAutomation, listAutomations } from './automations';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) throw new Error('로그인이 필요합니다');
  return userId;
}

function arr(v: any): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
}

const TOOLS: AgentToolDef[] = [
  { name: 'list_accounts', description: '연결된 인스타/블로그/티스토리 계정 목록(id, label)을 가져온다. 발행 전 먼저 호출.' },
  {
    name: 'generate_post',
    description: '주제로 제목+본문(마크다운)을 생성한다. 블로그/티스토리 글에 사용.',
    params: { topic: '글 주제(필수)', tone: 'info|guide|review|friendly (선택)', length: 'short|medium|long (선택)' },
  },
  {
    name: 'generate_image',
    description: '설명으로 이미지를 생성하고 URL을 돌려준다. 인스타 발행에 필요.',
    params: { prompt: '이미지 설명(필수)', ratio: 'square|portrait|story|landscape (선택, 기본 square)' },
  },
  {
    name: 'propose_publish',
    description: '제목/본문/이미지와 대상 계정 id 들로 "발행 제안"을 만든다. 실제 게시는 사용자가 버튼으로 확정한다.',
    params: {
      title: '제목(블로그/티스토리 필수)',
      body: '본문 마크다운(블로그/티스토리 필수)',
      imageUrl: '이미지 URL(인스타 필수)',
      instaIds: '인스타 계정 id 배열',
      blogIds: '블로그 계정 id 배열',
      tistoryIds: '티스토리 계정 id 배열',
    },
  },
  {
    name: 'create_automation',
    description: '반복 자동화를 만든다(예: "3시간마다 ~ 자동 발행"). 주기마다 AI가 글·이미지를 생성해 선택 채널에 자동 발행. 만들기 전에 list_accounts 로 계정 id 를 확보한다.',
    params: {
      name: '자동화 이름(예: "3시간마다 강아지 인스타")',
      intervalMinutes: '실행 주기(분). 예: 3시간=180, 하루=1440',
      topic: 'AI가 생성할 글 주제(필수)',
      tone: 'info|guide|review|friendly (선택)',
      length: 'short|medium|long (선택)',
      imagePrompt: '이미지 생성용 설명(선택, 없으면 topic 사용)',
      instaIds: '인스타 계정 id 배열',
      blogIds: '블로그 계정 id 배열',
      tistoryIds: '티스토리 계정 id 배열',
      startNow: '첫 실행을 지금 바로 할지(true/false, 기본 false)',
    },
  },
  { name: 'list_automations', description: '내가 만든 반복 자동화 목록(이름/주기/상태)을 가져온다.' },
];

function buildExecute(userId: string) {
  return async (name: string, args: any): Promise<any> => {
    switch (name) {
      case 'list_accounts': {
        const [insta, blog, tistory] = await Promise.all([
          prisma.instagramAccount.findMany({ where: { userId }, select: { id: true, username: true } }),
          prisma.blogAccount.findMany({ where: { userId }, select: { id: true, username: true, siteUrl: true } }),
          prisma.tistoryAccount.findMany({ where: { userId }, select: { id: true, username: true, siteUrl: true } }),
        ]);
        return {
          ok: true,
          instagram: insta.map((a) => ({ id: a.id, label: '@' + a.username })),
          blog: blog.map((a) => ({ id: a.id, label: `${a.username} (${a.siteUrl})` })),
          tistory: tistory.map((a) => ({ id: a.id, label: `${a.username} (${a.siteUrl})` })),
        };
      }
      case 'generate_post': {
        const r = await generateBlogPost(userId, {
          topic: String(args?.topic || ''),
          tone: args?.tone,
          length: args?.length,
        });
        return r.ok ? { ok: true, title: r.title, markdown: r.markdown } : { ok: false, error: r.error };
      }
      case 'generate_image': {
        const r = await generateImage(String(args?.prompt || ''), args?.ratio || 'square');
        return r.ok ? { ok: true, url: r.url } : { ok: false, error: r.error };
      }
      case 'propose_publish': {
        const instaIds = arr(args?.instaIds);
        const blogIds = arr(args?.blogIds);
        const tistoryIds = arr(args?.tistoryIds);
        // 소유 검증 — 사용자 계정만 통과
        const [insta, blog, tistory] = await Promise.all([
          instaIds.length ? prisma.instagramAccount.findMany({ where: { id: { in: instaIds }, userId }, select: { id: true } }) : [],
          blogIds.length ? prisma.blogAccount.findMany({ where: { id: { in: blogIds }, userId }, select: { id: true } }) : [],
          tistoryIds.length ? prisma.tistoryAccount.findMany({ where: { id: { in: tistoryIds }, userId }, select: { id: true } }) : [],
        ]);
        const proposal: PublishToChannelsInput = {
          title: String(args?.title || '').trim(),
          body: String(args?.body || '').trim(),
          imageUrl: String(args?.imageUrl || '').trim() || undefined,
          instaIds: insta.map((a) => a.id),
          blogIds: blog.map((a) => a.id),
          tistoryIds: tistory.map((a) => a.id),
        };
        const total = proposal.instaIds.length + proposal.blogIds.length + proposal.tistoryIds.length;
        if (total === 0) return { ok: false, error: '유효한 대상 계정이 없습니다. list_accounts 의 id 를 사용하세요.' };
        return { ok: true, proposal };
      }
      case 'create_automation': {
        const config = {
          source: {
            kind: 'ai' as const,
            topic: String(args?.topic || ''),
            tone: args?.tone,
            length: args?.length,
            withImage: arr(args?.instaIds).length > 0,
            imagePrompt: args?.imagePrompt ? String(args.imagePrompt) : undefined,
          },
          channels: { instaIds: arr(args?.instaIds), blogIds: arr(args?.blogIds), tistoryIds: arr(args?.tistoryIds) },
        };
        const r = await createAutomation({
          name: String(args?.name || '자동 발행'),
          intervalMinutes: Number(args?.intervalMinutes) || 180,
          config,
          startNow: !!args?.startNow,
        });
        return r.ok
          ? { ok: true, id: r.id, message: '자동화를 만들었어요. /automations 에서 관리할 수 있어요.' }
          : { ok: false, error: r.error };
      }
      case 'list_automations': {
        const items = await listAutomations();
        return {
          ok: true,
          automations: items.map((a) => ({
            id: a.id, name: a.name, status: a.status, intervalMinutes: a.intervalMinutes,
            nextRunAt: a.nextRunAt, lastStatus: a.lastStatus,
          })),
        };
      }
    }
    return { ok: false, error: '알 수 없는 도구: ' + name };
  };
}

export interface AgentDraft {
  title?: string;
  markdown?: string;
  imageUrl?: string;
}

export interface AgentChatResult {
  ok: boolean;
  reply: string;
  draft?: AgentDraft;
  proposal?: PublishToChannelsInput;
  error?: string;
}

/** 허브 AI 채팅 — 도구 사용 에이전트 한 번 실행. history 의 마지막이 새 사용자 메시지. */
export async function agentChat(history: { role: 'user' | 'assistant'; content: string }[]): Promise<AgentChatResult> {
  const userId = await requireUserId();
  const execute = buildExecute(userId);
  const res = await runAgent({ userId, history, tools: TOOLS, execute, maxSteps: 8 });
  if (!res.ok) return { ok: false, reply: '', error: res.error };

  let draft: AgentDraft | undefined;
  let proposal: PublishToChannelsInput | undefined;
  for (const ev of res.events) {
    if (ev.tool === 'generate_post' && ev.result?.ok) {
      draft = { ...(draft || {}), title: ev.result.title, markdown: ev.result.markdown };
    }
    if (ev.tool === 'generate_image' && ev.result?.ok) {
      draft = { ...(draft || {}), imageUrl: ev.result.url };
    }
    if (ev.tool === 'propose_publish' && ev.result?.ok) {
      proposal = ev.result.proposal;
    }
  }
  return { ok: true, reply: res.reply, draft, proposal };
}

/** 사용자가 화면에서 "발행" 확정 → 실제 다채널 발행. */
export async function confirmPublish(proposal: PublishToChannelsInput): Promise<PublishResult> {
  await requireUserId();
  return publishToChannels({ ...proposal, publishNow: true });
}
