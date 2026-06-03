/**
 * 경량 RSS 2.0 / Atom 파서(라이브러리 없이). 자동화 'rss' 소스용.
 * 일반적인 피드의 최신 항목들을 {guid,title,link,summary} 로 추출.
 */

export interface FeedItem {
  guid: string;
  title: string;
  link: string;
  summary: string;
}

function decode(s: string): string {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ') // HTML 태그 제거
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function pick(block: string, tags: string[]): string {
  for (const t of tags) {
    const m = new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i').exec(block);
    if (m) return decode(m[1]);
  }
  return '';
}

function pickLink(block: string): string {
  // RSS <link>...</link> 또는 Atom <link href="..."/>
  const rss = /<link[^>]*>([\s\S]*?)<\/link>/i.exec(block);
  if (rss && rss[1].trim()) return decode(rss[1]);
  const atom = /<link[^>]*href=["']([^"']+)["']/i.exec(block);
  if (atom) return atom[1];
  return '';
}

/** 피드 URL 에서 항목 목록(최신순 가정)을 가져온다. */
export async function fetchFeedItems(url: string, limit = 10): Promise<FeedItem[]> {
  const res = await fetch(url, { headers: { 'User-Agent': 'amakers-bot/1.0' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`피드 요청 실패 ${res.status}`);
  const xml = await res.text();

  const blocks: string[] = [];
  const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
  const entryRe = /<entry[\s>][\s\S]*?<\/entry>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) && blocks.length < limit) blocks.push(m[0]);
  if (blocks.length === 0) {
    while ((m = entryRe.exec(xml)) && blocks.length < limit) blocks.push(m[0]);
  }

  return blocks.map((b) => {
    const title = pick(b, ['title']);
    const link = pickLink(b);
    const summary = pick(b, ['description', 'summary', 'content', 'content:encoded']);
    const guid = pick(b, ['guid', 'id']) || link || title;
    return { guid, title, link, summary };
  }).filter((it) => it.title || it.summary);
}
