/**
 * 쿠팡 상세페이지 scraper.
 *
 * 쿠팡 패턴:
 *   - 대표 이미지: meta og:image
 *   - 옵션/썸네일: <ul class="prod-image__items"> 안의 <img data-original|src>
 *   - 상세 이미지: <div class="prod-description"> 또는 iframe 안의 <img>
 *   - 가격: meta itemprop="price"
 *   - 제목: meta og:title
 *
 * 쿠팡 봇 차단:
 *   - 단순 fetch 도 보통 응답 (User-Agent 만 일반 브라우저면 OK)
 *   - 동적 lazy load 는 거의 없음 — 정적 HTML 충분
 */

import type { ScrapeResult, ScrapedImage } from './index';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'ko-KR,ko;q=0.9',
    'Referer': 'https://www.coupang.com/',
};

export async function scrapeCoupang(url: string): Promise<ScrapeResult> {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`쿠팡 응답 ${res.status}`);
    const html = await res.text();

    const images: ScrapedImage[] = [];
    const seen = new Set<string>();

    // 대표 이미지
    const ogImg = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
    if (ogImg) {
        const u = absUrl(ogImg);
        seen.add(u);
        images.push({ url: u, type: 'main', alt: 'main' });
    }

    // 옵션 썸네일 + 상세 이미지 (img 태그 모두)
    const imgRegex = /<img[^>]*\s(?:src|data-src|data-original|data-img-src)=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRegex.exec(html)) !== null) {
        const u = absUrl(m[1]);
        if (seen.has(u)) continue;
        if (/icon|logo|sprite|emoji|button|pixel/i.test(u)) continue;
        // 쿠팡 CDN 패턴 강화 — image*.coupangcdn.com
        if (!/coupangcdn\.com|coupang\.com/.test(u)) continue;
        seen.add(u);
        images.push({ url: u, type: 'detail' });
        if (images.length >= 50) break;
    }

    const title = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]?.trim();
    const price = html.match(/<meta\s+itemprop=["']price["']\s+content=["']([^"']+)["']/i)?.[1]?.trim()
        || html.match(/class=["']total-price["'][^>]*>[^<]*<strong>([\d,]+)/i)?.[1]?.trim();

    return { source: 'coupang', title, price, images };
}

function absUrl(maybeRelative: string): string {
    if (maybeRelative.startsWith('//')) return 'https:' + maybeRelative;
    if (maybeRelative.startsWith('/')) return 'https://www.coupang.com' + maybeRelative;
    return maybeRelative;
}
