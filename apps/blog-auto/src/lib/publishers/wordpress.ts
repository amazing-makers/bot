/**
 * WordPress REST API publisher — HTTP only, 에이전트 불필요.
 * (마케팅봇 src/lib/publishers/wordpress.ts 에서 이식.)
 *
 * 자격증명:
 *   - siteUrl:     워드프레스 사이트 base URL (예: https://myblog.com)
 *   - username:    계정 username
 *   - appPassword: Application Password (WP 5.6+, 관리자 → 사용자 → 프로필 → Application Passwords)
 *
 * REST API:
 *   - POST {siteUrl}/wp-json/wp/v2/media  (이미지 업로드)
 *   - POST {siteUrl}/wp-json/wp/v2/posts  (게시글 작성)
 *   - Authorization: Basic base64(username:appPassword)
 */

export interface WordPressCredentials {
    siteUrl: string;
    username: string;
    appPassword: string;
}

export interface WordPressPublishInput {
    credentials: WordPressCredentials;
    /** 본문 (HTML/plain — WP 가 wpautop 처리). */
    content: string;
    title?: string;
    /** 대표 이미지 — public https 또는 data URL. */
    photoUrl?: string;
    status?: 'publish' | 'draft' | 'private';
    categories?: number[];
    tags?: number[];
}

export interface WordPressPublishResult {
    postId: number;
    link: string;
    mediaId?: number;
}

function authHeader(creds: WordPressCredentials): string {
    const token = Buffer.from(`${creds.username}:${creds.appPassword}`).toString('base64');
    return `Basic ${token}`;
}

function normalizeSiteUrl(url: string): string {
    let u = url.trim().replace(/\/$/, '');
    if (u.startsWith('http://')) u = 'https://' + u.slice(7);
    if (!u.startsWith('https://')) u = 'https://' + u;
    return u;
}

function deriveTitle(content: string, fallback = '새 게시글'): string {
    const firstLine = content.split('\n')[0]?.trim() || fallback;
    return firstLine.length > 80 ? firstLine.slice(0, 77) + '…' : firstLine;
}

async function uploadImageToWordPress(
    creds: WordPressCredentials,
    photoUrl: string,
): Promise<{ id: number; sourceUrl: string }> {
    let bytes: Buffer;
    let mime = 'image/png';
    let filename = `blogauto-${Date.now()}.png`;

    if (photoUrl.startsWith('data:')) {
        const match = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new Error('data URL 형식 오류');
        mime = match[1];
        bytes = Buffer.from(match[2], 'base64');
        const ext = mime.split('/')[1] || 'png';
        filename = `blogauto-${Date.now()}.${ext}`;
    } else if (photoUrl.startsWith('https://') || photoUrl.startsWith('http://')) {
        const r = await fetch(photoUrl, { signal: AbortSignal.timeout(60000) });
        if (!r.ok) throw new Error(`이미지 fetch 실패 ${r.status}`);
        bytes = Buffer.from(await r.arrayBuffer());
        mime = r.headers.get('content-type') || 'image/png';
        const ext = mime.split('/')[1] || 'png';
        filename = `blogauto-${Date.now()}.${ext}`;
    } else {
        throw new Error('지원되지 않는 photoUrl 형식 (https / data:image 만)');
    }

    const siteUrl = normalizeSiteUrl(creds.siteUrl);
    const r = await fetch(`${siteUrl}/wp-json/wp/v2/media`, {
        method: 'POST',
        headers: {
            Authorization: authHeader(creds),
            'Content-Type': mime,
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(120000),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(`media upload ${r.status}: ${data?.message || JSON.stringify(data).slice(0, 200)}`);
    return { id: data.id, sourceUrl: data.source_url };
}

/** 게시글 발행. 이미지 있으면 먼저 미디어 업로드 → featured_media 첨부. */
export async function publishToWordPress(input: WordPressPublishInput): Promise<WordPressPublishResult> {
    const { credentials, content, title, photoUrl, status = 'publish', categories, tags } = input;
    if (!credentials.siteUrl || !credentials.username || !credentials.appPassword) {
        throw new Error('WordPress 자격증명 누락 (siteUrl/username/appPassword)');
    }

    const siteUrl = normalizeSiteUrl(credentials.siteUrl);
    let mediaId: number | undefined;

    if (photoUrl) {
        const uploaded = await uploadImageToWordPress(credentials, photoUrl);
        mediaId = uploaded.id;
    }

    const body: any = {
        title: title || deriveTitle(content),
        content,
        status,
    };
    if (mediaId) body.featured_media = mediaId;
    if (categories?.length) body.categories = categories;
    if (tags?.length) body.tags = tags;

    const r = await fetch(`${siteUrl}/wp-json/wp/v2/posts`, {
        method: 'POST',
        headers: {
            Authorization: authHeader(credentials),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
    });
    const data = await r.json();
    if (!r.ok) {
        throw new Error(`WordPress posts ${r.status}: ${data?.message || JSON.stringify(data).slice(0, 200)}`);
    }

    return { postId: data.id, link: data.link, mediaId };
}

/** 자격증명 검증 — /users/me 호출. */
export async function verifyWordPressCredentials(
    creds: WordPressCredentials,
): Promise<{ ok: boolean; username?: string; error?: string }> {
    if (!creds.siteUrl || !creds.username || !creds.appPassword) {
        return { ok: false, error: '자격증명 누락' };
    }
    const siteUrl = normalizeSiteUrl(creds.siteUrl);
    try {
        const r = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
            headers: { Authorization: authHeader(creds) },
            signal: AbortSignal.timeout(15000),
        });
        const data = await r.json();
        if (!r.ok) {
            return { ok: false, error: data?.message || `HTTP ${r.status}` };
        }
        return { ok: true, username: data?.username || data?.name };
    } catch (e: any) {
        return { ok: false, error: e?.message || '네트워크 오류' };
    }
}
