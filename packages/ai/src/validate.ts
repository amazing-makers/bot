/**
 * @amakers/ai — BYOK 키 유효성 검증 (저장 전 실제 호출로 확인).
 * 잘못된 키를 저장 후 나중에 실패하는 대신, 등록 시점에 즉시 검증.
 */

import type { AiProvider } from './api-keys';

export interface ValidateResult {
  ok: boolean;
  error?: string;
}

async function withTimeout(p: Promise<Response>, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p;
  } finally {
    clearTimeout(t);
  }
}

/** provider 별 가벼운 인증 엔드포인트 호출 → 200 이면 유효. */
export async function validateApiKey(provider: AiProvider, key: string): Promise<ValidateResult> {
  const trimmed = (key || '').trim();
  if (trimmed.length < 10) return { ok: false, error: 'API 키가 너무 짧습니다.' };

  try {
    if (provider === 'gemini') {
      const res = await withTimeout(
        fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmed)}`, {
          method: 'GET',
        }),
        12000,
      );
      if (res.ok) return { ok: true };
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { ok: false, error: '키가 유효하지 않습니다. Google AI Studio에서 다시 확인하세요.' };
      }
      return { ok: false, error: `검증 실패 (HTTP ${res.status})` };
    }

    if (provider === 'groq') {
      const res = await withTimeout(
        fetch('https://api.groq.com/openai/v1/models', {
          method: 'GET',
          headers: { Authorization: `Bearer ${trimmed}` },
        }),
        12000,
      );
      if (res.ok) return { ok: true };
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: '키가 유효하지 않습니다. Groq 콘솔에서 다시 확인하세요.' };
      }
      return { ok: false, error: `검증 실패 (HTTP ${res.status})` };
    }

    return { ok: false, error: '알 수 없는 provider' };
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, error: '검증 시간 초과 — 잠시 후 다시 시도하세요.' };
    return { ok: false, error: '검증 중 네트워크 오류' };
  }
}
