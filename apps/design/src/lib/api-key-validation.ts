/**
 * BYOK 키 입력 시 실제로 valid 한지 검증.
 *
 * 각 프로바이더의 가벼운 endpoint 를 호출 (auth 통과 여부만 확인 — 비용 X 또는 최소).
 * 결과: { ok: true } 또는 { ok: false, error: '...' }
 *
 * 호출 비용:
 *   - OpenAI: GET /v1/models — 무료
 *   - Anthropic: messages.create with 1 token — ~$0.0001 (사실상 무료)
 *   - Replicate: GET /v1/account — 무료
 */

import { Provider } from './api-keys';

export interface ValidationResult {
    ok: boolean;
    error?: string;
    /** 일부 프로바이더는 계정 정보 (잔액, 이메일 등) 도 반환. */
    accountInfo?: { label: string; value: string }[];
}

async function validateOpenAI(key: string): Promise<ValidationResult> {
    try {
        const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(10000),
        });
        if (res.status === 401) return { ok: false, error: 'OpenAI 키가 유효하지 않음 (401)' };
        if (res.status === 403) return { ok: false, error: 'OpenAI 키 권한 부족 (403)' };
        if (!res.ok) return { ok: false, error: `OpenAI 응답 ${res.status}` };
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: 'OpenAI 연결 실패: ' + (e?.message || '') };
    }
}

async function validateAnthropic(key: string): Promise<ValidationResult> {
    try {
        // 가장 작은 호출 — 1 token max + Haiku (저렴)
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'hi' }],
            }),
            signal: AbortSignal.timeout(15000),
        });
        if (res.status === 401) return { ok: false, error: 'Anthropic 키가 유효하지 않음 (401)' };
        if (res.status === 403) return { ok: false, error: 'Anthropic 키 권한 부족 (403)' };
        if (res.status === 400) {
            // bad request 인데 401 아니면 키는 valid (모델 이슈 등)
            return { ok: true };
        }
        if (!res.ok) return { ok: false, error: `Anthropic 응답 ${res.status}` };
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: 'Anthropic 연결 실패: ' + (e?.message || '') };
    }
}

async function validateReplicate(key: string): Promise<ValidationResult> {
    try {
        const res = await fetch('https://api.replicate.com/v1/account', {
            headers: { Authorization: `Bearer ${key}` },
            signal: AbortSignal.timeout(10000),
        });
        if (res.status === 401) return { ok: false, error: 'Replicate 토큰이 유효하지 않음 (401)' };
        if (!res.ok) return { ok: false, error: `Replicate 응답 ${res.status}` };
        const data = await res.json().catch(() => ({}));
        const accountInfo: { label: string; value: string }[] = [];
        if (data?.username) accountInfo.push({ label: 'username', value: data.username });
        if (data?.name) accountInfo.push({ label: 'name', value: data.name });
        return { ok: true, accountInfo };
    } catch (e: any) {
        return { ok: false, error: 'Replicate 연결 실패: ' + (e?.message || '') };
    }
}

export async function validateApiKey(provider: Provider, key: string): Promise<ValidationResult> {
    const trimmed = key.trim();
    if (!trimmed || trimmed.length < 10) {
        return { ok: false, error: '키가 너무 짧음' };
    }

    // 형태 사전 검증 (실제 호출 전에 obvious 한 잘못 거르기)
    if (provider === 'openai' && !trimmed.startsWith('sk-')) {
        return { ok: false, error: 'OpenAI 키는 sk- 로 시작' };
    }
    if (provider === 'anthropic' && !trimmed.startsWith('sk-ant-')) {
        return { ok: false, error: 'Anthropic 키는 sk-ant- 로 시작' };
    }
    if (provider === 'replicate' && !trimmed.startsWith('r8_')) {
        return { ok: false, error: 'Replicate 토큰은 r8_ 로 시작' };
    }

    switch (provider) {
        case 'openai':    return validateOpenAI(trimmed);
        case 'anthropic': return validateAnthropic(trimmed);
        case 'replicate': return validateReplicate(trimmed);
        default:
            return { ok: false, error: '알 수 없는 provider' };
    }
}
