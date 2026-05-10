/**
 * 1688 (알리바바 도매) 상세페이지 scraper.
 *
 * 1688 은 타오바오보다 봇 차단이 약함 — 정적 HTML 가능.
 * 이미지 패턴:
 *   - cbu01.alicdn.com 또는 img.alicdn.com
 */

import type { ScrapeResult, ScrapedImage } from './index';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'zh-CN,zh;q=0.9,ko;q=0.8',
};

export async function scrape1688(url: string): Promise<ScrapeResult> {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`1688 응답 ${res.status}`);
    const html = await res.text();

    const images: ScrapedImage[] = [];
    const seen = new Set<string>();

    const ogImg = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
    if (ogImg) {
        const u = absUrl(ogImg);
        seen.add(u);
        images.push({ url: u, type: 'main' });
    }

    // 1688 alicdn 패턴
    const imgRegex = /https?:\/\/(?:cbu01|img)\.alicdn\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:_\d+x\d+)?(?:\.jpg|\.png)?/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRegex.exec(html)) !== null) {
        const u = m[0];
        if (seen.has(u)) continue;
        if (/icon|logo|sprite|avatar|loading/i.test(u)) continue;
        seen.add(u);
        images.push({ url: u, type: 'detail' });
        if (images.length >= 50) break;
    }

    const title = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]?.trim()
        || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

    return { source: '1688', title, images };
}

function absUrl(maybeRelative: string): string {
    if (maybeRelative.startsWith('//')) return 'https:' + maybeRelative;
    return maybeRelative;
}
