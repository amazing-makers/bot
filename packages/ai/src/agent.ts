/**
 * @amakers/ai — 도구 사용(tool-use) 에이전트 루프. provider 무관(JSON 프로토콜).
 *
 * 모델에게 "매 턴 JSON 하나만" 출력하게 시키고( {"action":..,"args":..} | {"final":..} ),
 * action 이면 호출자가 준 execute() 로 실행 → 결과를 다시 모델에 먹여 반복. 네이티브
 * function-calling 형식 차이를 피해 Gemini/Groq 양쪽에서 안정 동작한다.
 *
 *   const res = await runAgent({ userId, history, tools, execute });
 *   res.reply  // 사용자에게 보일 최종 메시지
 *   res.events // [{ tool, args, result }] — UI가 초안/발행제안 추출에 사용
 */

import { resolveAllAiKeys } from './api-keys';
import { chatComplete, type ChatMessage } from './llm';

function isQuotaError(e: any): boolean {
  const m = String(e?.message || e || '');
  return /\b429\b|quota|exceeded|rate.?limit|RESOURCE_EXHAUSTED/i.test(m);
}

export interface AgentToolDef {
  name: string;
  description: string;
  /** 인자 이름 → 설명(한국어). 비우면 인자 없음. */
  params?: Record<string, string>;
}

export interface AgentEvent {
  tool: string;
  args: any;
  result: any;
}

export interface RunAgentOptions {
  userId: string;
  /** 사용자에게 보이는 대화 기록(마지막이 새 사용자 메시지). */
  history: ChatMessage[];
  tools: AgentToolDef[];
  execute: (name: string, args: any) => Promise<any>;
  extraSystem?: string;
  maxSteps?: number;
}

export interface RunAgentResult {
  ok: boolean;
  reply: string;
  events: AgentEvent[];
  provider?: string;
  error?: string;
}

function buildSystem(tools: AgentToolDef[], extra?: string): string {
  const toolDoc = tools
    .map((t) => {
      const ps = t.params && Object.keys(t.params).length
        ? Object.entries(t.params).map(([k, v]) => `      - ${k}: ${v}`).join('\n')
        : '      (인자 없음)';
      return `  • ${t.name} — ${t.description}\n    args:\n${ps}`;
    })
    .join('\n');
  return [
    '너는 한국어 SNS 자동화 비서다. 사용자의 요청을 아래 도구들로 수행한다.',
    '',
    '⚠️ 출력 규칙(엄수): 매 턴 "JSON 객체 하나만" 출력한다. 설명·인사·마크다운·코드펜스(```) 금지.',
    '형식은 정확히 둘 중 하나:',
    '  1) 도구 호출:  {"action":"<도구이름>","args":{ ... }}',
    '  2) 최종 답변:  {"final":"<사용자에게 보여줄 친절한 한국어 메시지>"}',
    '',
    '작업 규칙:',
    '  - 발행/계정 관련 요청이면 먼저 list_accounts 로 어떤 채널이 연결돼 있는지 확인한다.',
    '  - 블로그/티스토리 글은 generate_post(주제→제목+본문)로 만든다.',
    '  - 인스타에는 이미지가 필수다 → generate_image 로 만든다.',
    '  - 발행은 propose_publish 까지만 한다(실제 게시는 사용자가 화면의 "발행" 버튼으로 확정). 계정 id 는 list_accounts 결과의 id 를 그대로 쓴다.',
    '  - 정보가 부족하면 final 로 딱 한 가지만 되묻는다(예: 어떤 계정에 올릴지).',
    '  - 모든 단계가 끝나면 final 로 무엇을 했는지 간단히 요약한다.',
    '',
    '사용 가능한 도구:',
    toolDoc,
    extra ? `\n${extra}` : '',
  ].join('\n');
}

function parseJsonObject(text: string): any | null {
  let t = (text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(t);
  } catch {
    // 본문 속 첫 {...} 추출 시도
  }
  const s = t.indexOf('{');
  const e = t.lastIndexOf('}');
  if (s >= 0 && e > s) {
    try {
      return JSON.parse(t.slice(s, e + 1));
    } catch {
      return null;
    }
  }
  return null;
}

/** 한도(429) 시 다음 provider 로 폴백하며 LLM 호출. */
async function completeWithFallback(
  keys: Array<{ provider: any; key: string }>,
  startIdx: { i: number },
  args: { system: string; messages: ChatMessage[] },
): Promise<string> {
  let lastErr: any;
  for (let j = startIdx.i; j < keys.length; j++) {
    try {
      const text = await chatComplete({ provider: keys[j].provider, key: keys[j].key, system: args.system, messages: args.messages, maxTokens: 1200, temperature: 0.4 });
      startIdx.i = j; // 이후 단계도 이 provider 우선
      return text;
    } catch (e) {
      lastErr = e;
      if (isQuotaError(e) && j < keys.length - 1) continue; // 다음 provider 로
      throw e;
    }
  }
  throw lastErr;
}

/** BYOK 키로 도구 사용 에이전트를 실행한다. */
export async function runAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
  const keys = await resolveAllAiKeys(opts.userId);
  if (keys.length === 0) {
    return { ok: false, reply: '', events: [], error: 'AI 키가 없습니다 — 설정(키)에서 무료 Gemini/Groq 키를 먼저 등록하세요.' };
  }
  const system = buildSystem(opts.tools, opts.extraSystem);
  const messages: ChatMessage[] = [...opts.history];
  const events: AgentEvent[] = [];
  const maxSteps = opts.maxSteps ?? 6;
  const keyIdx = { i: 0 };

  try {
    for (let step = 0; step < maxSteps; step++) {
      const text = await completeWithFallback(keys, keyIdx, { system, messages });
      const obj = parseJsonObject(text);
      if (!obj) {
        // JSON 아니면 그대로 사용자 답변으로 간주
        return { ok: true, reply: text || '죄송해요, 한 번만 더 말씀해 주세요.', events, provider: keys[keyIdx.i].provider };
      }
      if (typeof obj.final === 'string') {
        return { ok: true, reply: obj.final, events, provider: keys[keyIdx.i].provider };
      }
      if (typeof obj.action === 'string') {
        let result: any;
        try {
          result = await opts.execute(obj.action, obj.args || {});
        } catch (e: any) {
          result = { ok: false, error: e?.message || '도구 실행 오류' };
        }
        events.push({ tool: obj.action, args: obj.args || {}, result });
        messages.push({ role: 'assistant', content: JSON.stringify(obj) });
        messages.push({ role: 'user', content: `TOOL_RESULT(${obj.action}): ${JSON.stringify(result).slice(0, 4000)}` });
        continue;
      }
      // 알 수 없는 형태 → 텍스트를 답변으로
      return { ok: true, reply: text, events, provider: keys[keyIdx.i].provider };
    }
    return { ok: true, reply: '작업이 길어졌어요. 요청을 조금 더 작게 나눠 말씀해 주세요.', events, provider: keys[keyIdx.i].provider };
  } catch (e: any) {
    if (e?.name === 'TimeoutError') return { ok: false, reply: '', events, error: 'AI 응답 시간이 초과됐어요. 다시 시도해 주세요.' };
    if (isQuotaError(e)) {
      const hasGroq = keys.some((k) => k.provider === 'groq');
      return {
        ok: false, reply: '', events,
        error: hasGroq
          ? 'AI 키 무료 사용량이 모두 초과됐어요. 1~2분 후 다시 시도해 주세요(무료 한도는 분/일 단위로 회복됩니다).'
          : 'Gemini 무료 사용량이 초과됐어요. 1~2분 뒤 다시 시도하거나, 설정(키)에서 Groq 키도 등록하면 한도 초과 시 자동 전환됩니다.',
      };
    }
    return { ok: false, reply: '', events, error: e?.message || 'AI 오류' };
  }
}
