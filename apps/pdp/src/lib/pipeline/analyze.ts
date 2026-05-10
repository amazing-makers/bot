/**
 * 상품 자동 분석 — Claude Opus 4.7 (Vision) 으로 상품 이미지 + 제목 + 사이트 정보를 종합 분석.
 *
 * 출력: 셀러가 의사결정에 직접 사용할 수 있는 한국 시장 기반 분석.
 *   - category / subcategory
 *   - features: 핵심 특징 (소재, 크기, 기능 등)
 *   - targetAudience: 한국 시장 타겟층
 *   - competitivePoints: 경쟁 강점
 *   - suggestedPriceRange: 한국 시장 추천 가격대 (KRW)
 *   - marketingHooks: SNS/광고 카피용 짧은 문구 (5-10개)
 *   - keywords: 한국 검색 키워드 (네이버 쇼핑 / 쿠팡 SEO 친화)
 *
 * 비용: Claude Opus image input ≈ 10 credits / 분석.
 */

import { getAnthropic, CLAUDE_OPUS } from '../ai/anthropic';

export interface ProductAnalysis {
    category: string;
    subcategory?: string;
    features: string[];
    targetAudience: string;
    competitivePoints: string[];
    suggestedPriceRange?: {
        min: number;
        max: number;
        currency: 'KRW';
    };
    marketingHooks: string[];
    keywords: string[];
}

const SYSTEM_PROMPT = `너는 해외 상품을 한국 시장에 판매할 셀러를 돕는 마케팅 전문가야.
주어진 상품 이미지 + 사이트 정보를 분석해 셀러가 즉시 의사결정에 사용할 수 있는 정보를 JSON 으로 반환.

분석 시 고려할 점:
1) 한국 시장 기준 (가격대 / 타겟 / 키워드 모두 한국 셀러용).
2) features 는 사진에서 명확히 보이는 것 우선, 추측은 최소화.
3) marketingHooks 는 SNS·블로그·광고에서 즉시 사용 가능한 짧고 임팩트 있는 한국어 (해시태그·이모지 포함 가능).
4) keywords 는 네이버 쇼핑 / 쿠팡 검색에서 셀러가 SEO 로 사용할 만한 단어 5-10개.
5) suggestedPriceRange 는 비슷한 한국 시장 상품 가격대 추정 — 자신 없으면 생략.

응답 형식 — 반드시 JSON:
{
  "category": "주방용품 > 컵/머그",
  "subcategory": "텀블러",
  "features": ["400ml 용량", "스테인리스 스틸", "보온/보냉 6시간", "뚜껑 포함"],
  "targetAudience": "20-30대 직장인, 재택근무자, 1인 가구",
  "competitivePoints": ["뚜껑 기본 포함 (경쟁사 별도 판매)", "미니멀 디자인"],
  "suggestedPriceRange": { "min": 9900, "max": 19900, "currency": "KRW" },
  "marketingHooks": [
    "재택근무 필수템 ☕",
    "6시간 보온 — 출근길 따뜻한 커피 그대로",
    "#텀블러추천 #직장인필수템",
    "뚜껑 포함 — 가방 안에서도 안전"
  ],
  "keywords": ["텀블러", "보온 텀블러", "스테인리스 텀블러", "직장인 텀블러", "뚜껑 텀블러", "400ml 텀블러"]
}`;

export async function analyzeProduct(opts: {
    imageUrl: string;          // public URL — Claude 가 fetch
    title?: string;
    sourceSite?: string;       // 'coupang' | 'taobao' 등
    sourceUrl?: string;
}): Promise<ProductAnalysis> {
    const anthropic = getAnthropic();

    // Claude image input 은 base64 또는 URL — URL 직접 지원.
    const userContent: any[] = [
        {
            type: 'image',
            source: { type: 'url', url: opts.imageUrl },
        },
        {
            type: 'text',
            text: [
                `상품 정보:`,
                `- 제목 (원본): ${opts.title || '(없음)'}`,
                `- 출처 사이트: ${opts.sourceSite || 'unknown'}`,
                `- URL: ${opts.sourceUrl || 'N/A'}`,
                ``,
                `위 이미지 + 정보를 바탕으로 한국 시장 셀러용 분석을 JSON 으로 반환해줘.`,
            ].join('\n'),
        },
    ];

    const res = await anthropic.messages.create({
        model: CLAUDE_OPUS,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
    });

    const text = res.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text)
        .join('\n')
        .trim();

    // Claude 응답에서 JSON 추출 (코드 블록 안에 있을 수도)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude 응답에서 JSON 을 찾지 못함: ' + text.slice(0, 200));

    let parsed: ProductAnalysis;
    try {
        parsed = JSON.parse(jsonMatch[0]);
    } catch (e: any) {
        throw new Error('JSON 파싱 실패: ' + e.message);
    }

    // 검증 + 보정
    return {
        category: String(parsed.category || '미분류'),
        subcategory: parsed.subcategory ? String(parsed.subcategory) : undefined,
        features: Array.isArray(parsed.features) ? parsed.features.map(String).slice(0, 10) : [],
        targetAudience: String(parsed.targetAudience || ''),
        competitivePoints: Array.isArray(parsed.competitivePoints) ? parsed.competitivePoints.map(String).slice(0, 5) : [],
        suggestedPriceRange: (parsed.suggestedPriceRange &&
            typeof parsed.suggestedPriceRange.min === 'number' &&
            typeof parsed.suggestedPriceRange.max === 'number')
            ? {
                min: parsed.suggestedPriceRange.min,
                max: parsed.suggestedPriceRange.max,
                currency: 'KRW' as const,
            }
            : undefined,
        marketingHooks: Array.isArray(parsed.marketingHooks) ? parsed.marketingHooks.map(String).slice(0, 10) : [],
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String).slice(0, 15) : [],
    };
}
