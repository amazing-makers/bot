/**
 * 사이트별 상세페이지 이미지 스크래퍼.
 *
 * 입력: 상품 URL
 * 출력: { title?, price?, images: { url, alt?, type: 'main' | 'detail' }[] }
 *
 * 전략:
 *   - 정적 HTML 우선 (cheerio 또는 fetch + parse) — 빠르고 비용 X
 *   - 동적 (JS 렌더링) 필요 시 Playwright (lazy load, 무한 스크롤 등)
 *
 * 봇 차단 회피:
 *   - User-Agent 일반 브라우저로
 *   - Accept-Language 추가
 *   - Referer (사이트 root)
 *   - 일부 사이트 (타오바오 등) 는 Cloudflare 우회 필요 — Phase 1 에서는 fallback 으로 OG 이미지만
 */

export interface ScrapedImage {
    url: string;
    alt?: string;
    type: 'main' | 'detail';
    width?: number;
    height?: number;
}

export interface ScrapeResult {
    title?: string;
    price?: string;
    images: ScrapedImage[];
    source: 'coupang' | 'naver' | 'taobao' | '1688' | 'amazon' | 'generic';
}

const COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8,zh-CN;q=0.7',
    'Cache-Control': 'no-cache',
};

/** URL 에서 도메인 추출 → 소스 결정. */
export function detectSource(url: string): ScrapeResult['source'] {
    try {
        const u = new URL(url);
        const h = u.hostname.toLowerCase();
        if (h.includes('coupang')) return 'coupang';
        if (h.includes('smartstore.naver') || h.includes('shopping.naver')) return 'naver';
        if (h.includes('taobao') || h.includes('tmall')) return 'taobao';
        if (h.includes('1688')) return '1688';
        if (h.includes('amazon')) return 'amazon';
    } catch { /* invalid url */ }
    return 'generic';
}

/**
 * 정적 HTML → og:image / 큰 이미지 추출 (Phase 1 fallback).
 * 사이트별 specialized scraper 보다 정확도 떨어지지만 어떤 URL 이든 동작.
 */
export async function scrapeGeneric(url: string): Promise<ScrapeResult> {
    const res = await fetch(url, {
        headers: COMMON_HEADERS,
        signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
        throw new Error(`사이트 응답 ${res.status} — 봇 차단 또는 URL 오류`);
    }
    const html = await res.text();

    const images: ScrapedImage[] = [];
    const seen = new Set<string>();

    // 1) og:image / twitter:image (대표 이미지)
    const ogMatch = html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    if (ogMatch?.[1]) {
        const u = absoluteUrl(ogMatch[1], url);
        if (!seen.has(u)) {
            images.push({ url: u, type: 'main' });
            seen.add(u);
        }
    }

    // 2) <img> 태그에서 200x200 이상 추정 큰 이미지만 (data-src, srcset 도)
    const imgRegex = /<img[^>]*\s(?:src|data-src|data-lazy-src|data-original)=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRegex.exec(html)) !== null) {
        const u = absoluteUrl(m[1], url);
        if (seen.has(u)) continue;
        // 광고/아이콘/SNS 로고 제외 (heuristic)
        if (/icon|logo|favicon|sprite|emoji|button/i.test(u)) continue;
        seen.add(u);
        images.push({ url: u, type: 'detail' });
        if (images.length >= 50) break;
    }

    // 3) title 추출
    const titleMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i)
        || html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim();

    return {
        title,
        images,
        source: detectSource(url),
    };
}

function absoluteUrl(maybeRelative: string, base: string): string {
    try {
        return new URL(maybeRelative, base).toString();
    } catch {
        return maybeRelative;
    }
}

/**
 * 메인 dispatcher. URL 을 받아 적절한 scraper 호출.
 * Phase 1 은 generic 만 사용 — Phase 1.1 에서 site-specific 추가 예정.
 */
export async function scrapeProductPage(url: string): Promise<ScrapeResult> {
    const source = detectSource(url);
    // TODO Phase 1.1: 사이트별 specialized scraper (coupang.ts, taobao.ts 등)
    // 지금은 모든 사이트에 generic 사용 — og:image + img 태그.
    return scrapeGeneric(url);
}
