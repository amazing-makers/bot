/**
 * AI 캡션 생성 — 사용자 BYOK 키(Gemini/Groq)로 인스타 캡션 작성. (마케팅봇 caption.ts 참고)
 *
 * 무료 키: Gemini(aistudio.google.com) / Groq(console.groq.com).
 */

import { resolveAiKey } from '../api-keys';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export type CaptionTone = 'friendly' | 'professional' | 'witty' | 'sale';

const TONE_KO: Record<CaptionTone, string> = {
    friendly: '친근하고 따뜻한',
    professional: '전문적이고 신뢰감 있는',
    witty: '재치있고 유쾌한',
    sale: '구매를 유도하는 프로모션',
};

export interface CaptionInput {
    topic: string;
    tone?: CaptionTone;
    hashtagCount?: number;
}

export interface CaptionResult {
    ok: boolean;
    caption?: string;
    provider?: string;
    error?: string;
}

function buildPrompt({ topic, tone = 'friendly', hashtagCount = 8 }: CaptionInput): string {
    return [
        `너는 인스타그램 마케팅 카피라이터다. 아래 주제로 ${TONE_KO[tone]} 톤의 한국어 인스타 캡션을 작성해라.`,
        `- 첫 줄에 시선을 끄는 후킹 문장`,
        `- 2200자 이내, 자연스러운 줄바꿈, 이모지 적절히`,
        `- 마지막에 관련 해시태그 ${hashtagCount}개 (한국어/영어 혼용, # 포함)`,
        `- 설명 없이 캡션 본문만 출력`,
        ``,
        `주제: ${topic}`,
    ].join('\n');
}

async function geminiGenerate(key: string, prompt: string): Promise<string> {
    const r = await fetch(`${GEMINI_URL}/gemini-2.0-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: 2048 } }),
        signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 150)}`);
    const data = await r.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function groqGenerate(key: string, prompt: string): Promise<string> {
    const r = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 2048 }),
        signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 150)}`);
    const data = await r.json();
    return data?.choices?.[0]?.message?.content?.trim() || '';
}

/** 사용자 BYOK 키로 캡션 생성. 키 없으면 안내. */
export async function generateCaption(userId: string, input: CaptionInput): Promise<CaptionResult> {
    if (!input.topic?.trim()) return { ok: false, error: '주제를 입력하세요' };
    const resolved = await resolveAiKey(userId);
    if (!resolved) {
        return { ok: false, error: 'AI 키가 없습니다 — 설정에서 무료 Gemini/Groq 키를 등록하세요' };
    }
    const prompt = buildPrompt(input);
    try {
        const caption = resolved.provider === 'gemini'
            ? await geminiGenerate(resolved.key, prompt)
            : await groqGenerate(resolved.key, prompt);
        if (!caption) return { ok: false, error: '생성 결과가 비어있습니다 — 다시 시도하세요' };
        return { ok: true, caption: caption.slice(0, 2200), provider: resolved.provider };
    } catch (e: any) {
        return { ok: false, error: e?.message || 'AI 생성 오류' };
    }
}
