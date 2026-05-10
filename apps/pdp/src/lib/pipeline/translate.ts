/**
 * 번역 pipeline — Claude Opus 4.7 로 marketing 카피 번역.
 *
 * 핵심: 마케팅 톤 + 한국 셀러 입장에서 자연스러운 한국어 + 짧고 임팩트 있는 표현.
 * 단순 직역 X — 의역 + 한국 시장 컨텍스트 (예: 중국 "全场满199减30" → "전 상품 19만원 이상 3만원 할인").
 */

import { getAnthropic, DEFAULT_TRANSLATE_MODEL } from '../ai/anthropic';

const SYSTEM_PROMPT = `너는 해외 상품을 한국 시장에 판매하는 셀러를 돕는 마케팅 카피 번역가야.
규칙:
1) 원문 의미를 유지하되 한국 셀러가 그대로 사용 가능한 자연스러운 한국어로.
2) 가격은 한국 원화로 변환 또는 원문 통화 그대로 유지 (사용자 지시 따름).
3) 짧고 임팩트 있게. 광고 문구는 광고 톤으로, 안내문은 안내 톤으로.
4) 글자 수: 원문보다 1.2배 이내 (디자인 공간 고려).
5) 출력은 번역된 한국어 텍스트만 (설명·인용 부호·메타 X).`;

export async function translateToKorean(
    originalText: string,
    sourceLanguage?: string,
    userAnthropicKey?: string | null,
): Promise<string> {
    const anthropic = getAnthropic(userAnthropicKey);
    const userPrompt = `원문 (${sourceLanguage || '자동감지'}):
${originalText}

위 원문을 한국 셀러가 그대로 상세페이지에 사용할 수 있는 자연스러운 한국어로 번역.`;

    const res = await anthropic.messages.create({
        model: DEFAULT_TRANSLATE_MODEL,
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
    });

    // text content 모으기
    const text = res.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text)
        .join('\n')
        .trim();

    return text;
}

/**
 * 여러 region 을 한 번에 번역 — 토큰 효율 + 컨텍스트 일관성.
 * 출력 순서는 입력 순서 유지.
 */
export async function translateRegionsBatch(
    regions: Array<{ originalText: string; sourceLanguage?: string }>,
    userAnthropicKey?: string | null,
): Promise<string[]> {
    if (regions.length === 0) return [];

    const anthropic = getAnthropic(userAnthropicKey);
    const numbered = regions.map((r, i) => `[${i + 1}] (${r.sourceLanguage || '?'}) ${r.originalText}`).join('\n');

    const userPrompt = `다음은 한 상품 상세페이지 이미지에서 추출된 텍스트 영역들이다. 각각 자연스러운 한국어로 번역해줘.
같은 상품 컨텍스트 내에서 번역어를 일관되게 (예: 'Wireless' 가 여러 번 나오면 모두 같은 한국어).

${numbered}

응답 형식 — 한 줄에 하나씩, 번호 + 번역만:
[1] 한국어 번역 1
[2] 한국어 번역 2
...`;

    const res = await anthropic.messages.create({
        model: DEFAULT_TRANSLATE_MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
    });

    const text = res.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text)
        .join('\n');

    // 응답 파싱 — [번호] 텍스트 형식 추출
    const result: string[] = new Array(regions.length).fill('');
    const lineRegex = /\[(\d+)\]\s*(.+?)(?=\n\[\d+\]|\n*$)/gs;
    let m: RegExpExecArray | null;
    while ((m = lineRegex.exec(text)) !== null) {
        const idx = parseInt(m[1], 10) - 1;
        if (idx >= 0 && idx < regions.length) {
            result[idx] = m[2].trim();
        }
    }
    // 누락된 항목은 원문 폴백
    for (let i = 0; i < result.length; i++) {
        if (!result[i]) result[i] = regions[i].originalText;
    }
    return result;
}
