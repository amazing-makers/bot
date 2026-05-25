/**
 * Instagram Graph API publisher — HTTP only (서버 측 직접 발행, 에이전트 불필요).
 *
 * 전제: 인스타그램 계정이 **Business/Creator 계정** + **Facebook Page 연결** (개인 계정 ❌).
 * 자격증명: accessToken(Long-lived Page Access Token, 60일) + igUserId(IG Business Account ID).
 *
 * 발행 흐름 (2-step): POST /{ig-user-id}/media → creation_id → POST /{ig-user-id}/media_publish.
 *
 * 신뢰성:
 *   - 단계별 재시도 (네트워크/5xx/rate-limit 등 transient 만). container 는 한 번만 생성하고
 *     publish 단계 재시도 시 같은 creation_id 재사용 → 중복 발행 방지.
 *   - 에러에 status(HTTP) / fbCode(Graph API error.code) 부착 → 호출부가 토큰만료(190) 등 분기.
 */

const GRAPH_API = 'https://graph.facebook.com/v21.0';
const IG_CAPTION_LIMIT = 2200;

export interface InstagramCredentials {
    accessToken: string;
    igUserId: string;
}

export interface InstagramPublishInput {
    credentials: InstagramCredentials;
    caption: string;
    imageUrl?: string;
    videoUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'REELS';
}

export interface InstagramPublishResult {
    creationId: string;
    mediaId: string;
    permalink?: string;
}

/** Graph API 에러 — status(HTTP) + fbCode(error.code) 부착. */
export class InstagramApiError extends Error {
    status?: number;
    fbCode?: number;
    retryable: boolean;
    constructor(message: string, opts: { status?: number; fbCode?: number; retryable: boolean }) {
        super(message);
        this.name = 'InstagramApiError';
        this.status = opts.status;
        this.fbCode = opts.fbCode;
        this.retryable = opts.retryable;
    }
}

/** 토큰 만료/무효 (재연결 필요) 판별. */
export function isAuthError(e: unknown): boolean {
    const err = e as InstagramApiError;
    if (!err) return false;
    if (err.status === 401) return true;
    // FB: 190 = access token expired/invalid, 102 = session, 10/200/3 = permission
    return err.fbCode === 190 || err.fbCode === 102 || err.fbCode === 10 || err.fbCode === 200;
}

/** rate-limit / 일시 오류 등 재시도 가능 여부. */
function classifyRetryable(status: number | undefined, fbCode: number | undefined): boolean {
    if (status && status >= 500) return true; // 서버 오류
    // FB rate limit / transient: 4(app), 17(user), 32(page), 80004(ig), 613, 1/2(unknown transient)
    if (fbCode && [1, 2, 4, 17, 32, 341, 613, 80004].includes(fbCode)) return true;
    return false;
}

async function graphFetch(url: string, init: RequestInit, label: string): Promise<any> {
    let res: Response;
    try {
        res = await fetch(url, init);
    } catch (e: any) {
        // 네트워크/timeout → transient
        throw new InstagramApiError(`${label} 네트워크 오류: ${e?.message || e}`, { retryable: true });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const fbCode = data?.error?.code;
        const msg = data?.error?.message || JSON.stringify(data).slice(0, 200);
        throw new InstagramApiError(`${label} 실패 (${res.status}): ${msg}`, {
            status: res.status,
            fbCode,
            retryable: classifyRetryable(res.status, fbCode),
        });
    }
    return data;
}

/** transient 오류면 재시도 (지수 백오프). 영구 오류는 즉시 throw. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            const retryable = e instanceof InstagramApiError ? e.retryable : false;
            if (!retryable || i === attempts - 1) throw e;
            await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i))); // 1s, 2s
        }
    }
    throw lastErr;
}

/** 1단계: media container 생성 — creation_id. */
async function createMediaContainer(creds: InstagramCredentials, input: InstagramPublishInput): Promise<string> {
    const params = new URLSearchParams();
    params.set('access_token', creds.accessToken);
    params.set('caption', input.caption);
    if (input.videoUrl) {
        params.set('media_type', input.mediaType || 'REELS');
        params.set('video_url', input.videoUrl);
    } else if (input.imageUrl) {
        params.set('image_url', input.imageUrl);
    } else {
        throw new InstagramApiError('이미지 URL 또는 비디오 URL 이 필요합니다', { retryable: false });
    }
    const data = await graphFetch(`${GRAPH_API}/${creds.igUserId}/media`, {
        method: 'POST', body: params, signal: AbortSignal.timeout(60000),
    }, '인스타 container 생성');
    if (!data?.id) throw new InstagramApiError('container id 없음', { retryable: true });
    return data.id as string;
}

/** container 상태 폴링 (비디오 처리 대기). */
async function waitContainerReady(creds: InstagramCredentials, creationId: string): Promise<void> {
    for (let i = 0; i < 12; i++) {
        const data = await graphFetch(
            `${GRAPH_API}/${creationId}?fields=status_code&access_token=${creds.accessToken}`,
            { signal: AbortSignal.timeout(15000) }, '인스타 container 상태',
        ).catch(() => null);
        const code = data?.status_code;
        if (code === 'FINISHED' || code === 'PUBLISHED') return;
        if (code === 'ERROR' || code === 'EXPIRED') {
            throw new InstagramApiError(`인스타 미디어 처리 실패: status_code=${code}`, { retryable: false });
        }
        await new Promise((r) => setTimeout(r, 5000));
    }
}

/** 2단계: media_publish — media_id. */
async function publishContainer(creds: InstagramCredentials, creationId: string): Promise<string> {
    const params = new URLSearchParams();
    params.set('creation_id', creationId);
    params.set('access_token', creds.accessToken);
    const data = await graphFetch(`${GRAPH_API}/${creds.igUserId}/media_publish`, {
        method: 'POST', body: params, signal: AbortSignal.timeout(30000),
    }, '인스타 발행');
    if (!data?.id) throw new InstagramApiError('media id 없음', { retryable: true });
    return data.id as string;
}

/** 메인 발행 — container 1회 생성(재시도) → 상태 대기 → publish(재시도, 같은 creation_id). */
export async function publishToInstagram(input: InstagramPublishInput): Promise<InstagramPublishResult> {
    const { credentials, caption } = input;
    if (!credentials.accessToken) throw new InstagramApiError('Instagram accessToken 누락', { retryable: false });
    if (!credentials.igUserId) throw new InstagramApiError('Instagram igUserId 누락', { retryable: false });
    if (!caption?.trim()) throw new InstagramApiError('caption 이 비어있음', { retryable: false });
    if (caption.length > IG_CAPTION_LIMIT) {
        throw new InstagramApiError(`인스타 caption 한도 ${IG_CAPTION_LIMIT}자 초과 (현재 ${caption.length}자)`, { retryable: false });
    }
    if (!input.imageUrl && !input.videoUrl) {
        throw new InstagramApiError('인스타는 이미지 또는 비디오가 필수입니다', { retryable: false });
    }

    // container 는 한 번만 생성 (중복 발행 방지). 생성 자체는 transient 재시도.
    const creationId = await withRetry(() => createMediaContainer(credentials, input));
    await waitContainerReady(credentials, creationId);
    // publish 단계는 같은 creation_id 로 재시도 (중복 생성 X).
    const mediaId = await withRetry(() => publishContainer(credentials, creationId));

    let permalink: string | undefined;
    try {
        const d = await graphFetch(
            `${GRAPH_API}/${mediaId}?fields=permalink&access_token=${credentials.accessToken}`,
            { signal: AbortSignal.timeout(10000) }, 'permalink',
        );
        if (d?.permalink) permalink = d.permalink;
    } catch {
        /* permalink 실패는 무시 (발행은 성공) */
    }

    return { creationId, mediaId, permalink };
}

/** 자격증명 검증 — IG Business Account 조회. */
export async function verifyInstagramCredentials(
    accessToken: string,
    igUserId: string,
): Promise<{ ok: boolean; username?: string; followers?: number; error?: string }> {
    if (!accessToken) return { ok: false, error: 'accessToken 누락' };
    if (!igUserId) return { ok: false, error: 'igUserId 누락' };
    try {
        const r = await fetch(
            `${GRAPH_API}/${igUserId}?fields=username,followers_count&access_token=${accessToken}`,
            { signal: AbortSignal.timeout(15000) },
        );
        const data = await r.json().catch(() => ({}));
        if (!r.ok || !data?.username) {
            const msg = data?.error?.message || `HTTP ${r.status}`;
            return { ok: false, error: `IG 계정 조회 실패: ${msg}` };
        }
        return { ok: true, username: data.username, followers: data.followers_count };
    } catch (e: any) {
        return { ok: false, error: e?.message || '네트워크 오류' };
    }
}
