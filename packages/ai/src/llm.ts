/**
 * @amakers/ai — 멀티턴 LLM 호출 (BYOK Gemini/Groq). writer.ts 와 동일한 엔드포인트/모델.
 * 에이전트 루프(agent.ts)와 채팅에 사용. 함수호출(tool)은 JSON 프로토콜로 agent.ts 에서 처리.
 */

import type { AiProvider } from './api-keys';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatCompleteInput {
  provider: AiProvider;
  key: string;
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

async function geminiChat(key: string, system: string, messages: ChatMessage[], maxTokens: number, temperature: number): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const r = await fetch(`${GEMINI_URL}/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const data = await r.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  return (Array.isArray(parts) ? parts.map((p: any) => p?.text).filter(Boolean).join('') : '').trim();
}

async function groqChat(key: string, system: string, messages: ChatMessage[], maxTokens: number, temperature: number): Promise<string> {
  const msgs = [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))];
  const r = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: msgs, temperature, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(90000),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 150)}`);
  const data = await r.json();
  return (data?.choices?.[0]?.message?.content || '').trim();
}

/** 시스템 프롬프트 + 멀티턴 메시지로 LLM 응답 텍스트를 받는다. */
export async function chatComplete(input: ChatCompleteInput): Promise<string> {
  const maxTokens = input.maxTokens ?? 1024;
  const temperature = input.temperature ?? 0.4;
  return input.provider === 'gemini'
    ? geminiChat(input.key, input.system, input.messages, maxTokens, temperature)
    : groqChat(input.key, input.system, input.messages, maxTokens, temperature);
}
