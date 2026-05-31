/**
 * @amakers/ai — 마크다운 본문 → 인스타 캡션 자동 변환(기계적). "1작성→다채널"용.
 */

/** 마크다운 문법 제거 → 평문. */
export function stripMarkdown(md: string): string {
  return (md || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')        // 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')      // 링크 → 텍스트
    .replace(/^#{1,6}\s+/gm, '')                   // 헤딩
    .replace(/^>\s?/gm, '')                        // 인용
    .replace(/^[-*+]\s+/gm, '• ')                  // 목록
    .replace(/^\d+\.\s+/gm, '')                    // 번호 목록
    .replace(/\*\*([^*]+)\*\*/g, '$1')             // 볼드
    .replace(/\*([^*]+)\*/g, '$1')                 // 이탤릭
    .replace(/`([^`]+)`/g, '$1')                   // 인라인 코드
    .replace(/^[-*_]{3,}\s*$/gm, '')               // 구분선
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 제목+본문(마크다운) → 인스타 캡션. max 자 이내로 절단. */
export function deriveCaption(title: string, body: string, max = 2200): string {
  const t = (title || '').trim();
  const b = stripMarkdown(body || '');
  const combined = t ? `${t}\n\n${b}` : b;
  return combined.slice(0, max).trim();
}
