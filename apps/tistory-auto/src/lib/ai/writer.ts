/**
 * AI 블로그 글 작성 — 사용자 BYOK 키(Gemini/Groq)로 주제 → 제목+마크다운 본문 한 번에.
 *
 * 무료 키: Gemini(aistudio.google.com) / Groq(console.groq.com). 공유 @amakers/ai 키 사용.
 */

import { resolveAiKey } from '../api-keys';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export type BlogTone = 'info' | 'guide' | 'review' | 'friendly';
export type BlogLength = 'short' | 'medium' | 'long';

const TONE_KO: Record<BlogTone, string> = {
  info: '정보 전달 중심의 깔끔한',
  guide: '단계별로 친절히 알려주는 가이드',
  review: '경험과 장단점을 담은 리뷰',
  friendly: '친근하고 읽기 쉬운',
};
const LENGTH_TOKENS: Record<BlogLength, number> = { short: 1500, medium: 3000, long: 6000 };
const LENGTH_KO: Record<BlogLength, string> = { short: '600~900자', medium: '1200~1800자', long: '2000자 이상' };

export interface WriterInput {
  topic: string;
  tone?: BlogTone;
  length?: BlogLength;
}

export interface WriterResult {
  ok: boolean;
  title?: string;
  markdown?: string;
  provider?: string;
  error?: string;
}

function buildPrompt({ topic, tone = 'info', length = 'medium' }: WriterInput): string {
  return [
    `너는 한국어 블로그 작가다. 아래 주제로 ${TONE_KO[tone]} 톤의 블로그 글을 마크다운으로 작성해라.`,
    `- 첫 줄은 반드시 "# 제목" 형식 (매력적인 한 줄 제목)`,
    `- 그 다음 본문: 소제목(## ), 문단, 필요하면 목록(- )을 활용해 읽기 쉽게`,
    `- 분량 ${LENGTH_KO[length]}`,
    `- 과장 없이 실제로 유용한 내용, 자연스러운 한국어`,
    `- 마크다운 외의 설명 문구(예: "다음은...")는 출력하지 말 것`,
    ``,
    `주제: ${topic}`,
  ].join('\n');
}

async function geminiGenerate(key: string, prompt: string, maxTokens: number): Promise<string> {
  const r = await fetch(`${GEMINI_URL}/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const data = await r.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function groqGenerate(key: string, prompt: string, maxTokens: number): Promise<string> {
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const data = await r.json();
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

/** 첫 "# 제목" 을 제목으로 분리, 나머지를 본문 마크다운으로. */
function splitTitle(markdown: string): { title: string; body: string } {
  const text = markdown.trim().replace(/^```(?:markdown)?\n?|\n?```$/g, '').trim();
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+)/);
    if (m) {
      return { title: m[1].trim(), body: lines.slice(i + 1).join('\n').trim() };
    }
    if (lines[i].trim()) break;
  }
  return { title: '', body: text };
}

/** 사용자 BYOK 키로 블로그 글 생성. 키 없으면 안내. */
export async function generateBlogPost(userId: string, input: WriterInput): Promise<WriterResult> {
  if (!input.topic?.trim()) return { ok: false, error: '주제를 입력하세요' };
  const resolved = await resolveAiKey(userId);
  if (!resolved) {
    return { ok: false, error: 'AI 키가 없습니다 — 설정에서 무료 Gemini/Groq 키를 등록하세요' };
  }
  const prompt = buildPrompt(input);
  const maxTokens = LENGTH_TOKENS[input.length ?? 'medium'];
  try {
    const raw = resolved.provider === 'gemini'
      ? await geminiGenerate(resolved.key, prompt, maxTokens)
      : await groqGenerate(resolved.key, prompt, maxTokens);
    if (!raw) return { ok: false, error: '생성 결과가 비어있습니다 — 다시 시도하세요' };
    const { title, body } = splitTitle(raw);
    return { ok: true, title: title || input.topic.slice(0, 80), markdown: body, provider: resolved.provider };
  } catch (e: any) {
    if (e?.name === 'TimeoutError') return { ok: false, error: '생성 시간이 초과됐습니다 — 길이를 줄이거나 다시 시도하세요' };
    return { ok: false, error: e?.message || 'AI 생성 오류' };
  }
}
