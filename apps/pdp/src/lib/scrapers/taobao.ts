/**
 * 타오바오·티몰 상세페이지 scraper.
 *
 * 타오바오 패턴:
 *   - 강력한 봇 차단 — Cloudflare + 자체 anti-scraping
 *   - 정적 fetch 는 거의 차단 (login 페이지로 redirect)
 *   - 정상 추출하려면 Playwright + 로그인된 세션 또는 모바일 페이지
 *
 * Phase 1.2 전략 (간단):
 *   - 모바일 페이지 (m.taobao.com / detail.tmall.com/item.htm) 시도
 *   - og:image 정도만 추출 (대표 1장)
 *   - 정확한 상세 이미지는 사용자가 직접 다운로드한 후 R2 업로드 또는
 *     1688 (도매) 의 같은 상품을 사용
 *
 * Phase 1.3+ (Playwright):
 *   - launchBrowserContext 로 stealth 모드 chromium
 *   - 모바일 UA + 로그인 쿠키 (사용자 별도 등록)
 *   - lazy load 처리
 *
 * 현재 (Phase 1.2): mobile site fallback + og:image
 */

import type { ScrapeResult, ScrapedImage } from './index';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'zh-CN,zh;q=0.9,ko;q=0.8,en;q=0.7',
};

export async function scrapeTaobao(url: string): Promise<ScrapeResult> {
    // 데스크톱 → 모바일 URL 변환 시도
    let targetUrl = url;
    try {
        const u = new URL(url);
        if (u.hostname === 'item.taobao.com') {
            u.hostname = 'h5.m.taobao.com';
            u.pathname = '/awp/core/detail.htm';
            targetUrl = u.toString();
        }
    } catch { /* invalid */ }

    let html = '';
    try {
        const res = await fetch(targetUrl, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
        if (res.ok) html = await res.text();
    } catch { /* fetch 차단 가능 */ }

    const images: ScrapedImage[] = [];
    const seen = new Set<string>();

    if (html) {
        // og:image
        const ogImg = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1];
        if (ogImg) {
            const u = absUrl(ogImg);
            seen.add(u);
            images.push({ url: u, type: 'main' });
        }

        // 타오바오 CDN 패턴 — alicdn.com 도메인
        const imgRegex = /https?:\/\/[a-z0-9-]*\.alicdn\.com\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:_\d+x\d+)?(?:\.jpg|\.png)?/gi;
        let m: RegExpExecArray | null;
        while ((m = imgRegex.exec(html)) !== null) {
            const u = m[0];
            if (seen.has(u)) continue;
            if (/icon|logo|sprite|avatar|loading|placeholder/i.test(u)) continue;
            seen.add(u);
            images.push({ url: u, type: 'detail' });
            if (images.length >= 50) break;
        }
    }

    const title = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]?.trim();

    // 한 장도 못 찾으면 안내
    if (images.length === 0) {
        throw new Error('타오바오 봇 차단으로 이미지 추출 실패. 모바일 앱 / 1688 도매사이트 URL 또는 이미지 직접 업로드를 사용해주세요.');
    }

    return { source: 'taobao', title, images };
}

function absUrl(maybeRelative: string): string {
    if (maybeRelative.startsWith('//')) return 'https:' + maybeRelative;
    return maybeRelative;
}
