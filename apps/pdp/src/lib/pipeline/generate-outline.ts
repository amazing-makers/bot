/**
 * 신규 상세페이지 outline 자동 생성 (Phase 3.1).
 *
 * Claude Opus 4.7 이 상품 분석 결과 + 추가 사용자 지시 기반으로 모바일 친화적 상세페이지 구조를
 * 한국 시장 기준 마케팅 톤으로 자동 생성.
 *
 * 출력: 섹션별 (hero / feature / comparison / usage / social_proof / cta) 헤드라인 + 본문 + CTA + 이미지 prompt.
 *
 * 비용: ~5 credits (Claude Opus text only).
 */

import { getAnthropic, CLAUDE_OPUS } from '../ai/anthropic';
import type { ProductAnalysis } from './analyze';

export type SectionType = 'hero' | 'feature_list' | 'comparison' | 'usage' | 'social_proof' | 'cta';

export interface PageSection {
    type: SectionType;
    headline: string;
    body: string;
    cta?: string;
    /** 이 섹션 시각화 위한 이미지 생성 prompt (FLUX/DALL-E 입력용). 없으면 텍스트만. */
    imagePrompt?: string;
    /** UI 미리보기용 — 짧은 한국어 설명. */
    preview?: string;
}

export interface GeneratedPageOutline {
    sections: PageSection[];
    overallTone: 'casual' | 'professional' | 'luxurious' | 'fun';
    targetMobile: boolean;
}

const SYSTEM_PROMPT = `너는 한국 셀러를 위한 상세페이지 카피라이터 + 정보 설계자야.
주어진 상품 분석을 바탕으로 모바일 친화적 (1080px 폭 기준, 위에서 아래 스크롤) 상세페이지 outline 을 JSON 으로 반환.

규칙:
1) 섹션 6~9개 — 첫 hero 부터 마지막 CTA 까지.
2) 한국 셀러가 그대로 사용 가능한 마케팅 톤 (해시태그·이모지 OK, 너무 많지 않게).
3) 카피는 짧고 임팩트 있게 — 모바일 사용자 빠른 스크롤 고려.
4) imagePrompt 는 영문 (FLUX·DALL-E 입력용). 사진 스타일 명시 (예: "minimalist product photo, white background").
5) preview 는 한국어 1줄 — UI 에서 사용자가 미리 확인용.

섹션 타입:
- hero: 메인 배너 (큰 헤드라인 + 한 줄 강력한 CTA + 메인 상품 이미지)
- feature_list: 핵심 특징 3-5개 (아이콘 + 짧은 설명)
- comparison: 경쟁사 대비 강점 (시각적 표 또는 before/after)
- usage: 사용 시나리오 / 추천 상황
- social_proof: 후기 / 인기 통계 (실제 후기 데이터 없으면 일반적 카피)
- cta: 최종 구매 유도 (가격 + '지금 주문' 버튼)

응답 schema:
{
  "overallTone": "casual",
  "targetMobile": true,
  "sections": [
    {
      "type": "hero",
      "headline": "재택근무의 동반자, 6시간 보온 텀블러 ☕",
      "body": "출근길 따뜻한 커피 그대로, 점심 후에도 뜨겁게.",
      "cta": "지금 주문하기",
      "imagePrompt": "Minimalist photo of a stainless steel tumbler on a clean white desk, warm lighting, lifestyle product photography",
      "preview": "큰 메인 비주얼 + '지금 주문' CTA"
    },
    ...
  ]
}`;

export async function generateOutline(opts: {
    title?: string;
    analysis: ProductAnalysis;
    /** 사용자 추가 요청 — '브랜드 톤이 더 고급스럽게' 등. */
    userBrief?: string;
}): Promise<GeneratedPageOutline> {
    const anthropic = getAnthropic();
    const userPrompt = [
        `상품 정보:`,
        `- 제목: ${opts.title || '(없음)'}`,
        `- 카테고리: ${opts.analysis.category} ${opts.analysis.subcategory ? `> ${opts.analysis.subcategory}` : ''}`,
        `- 핵심 특징: ${opts.analysis.features.join(', ')}`,
        `- 타겟: ${opts.analysis.targetAudience}`,
        `- 경쟁 강점: ${opts.analysis.competitivePoints.join(', ')}`,
        `- 마케팅 카피 후보: ${opts.analysis.marketingHooks.slice(0, 5).join(' / ')}`,
        ``,
        opts.userBrief ? `사용자 요청: ${opts.userBrief}` : '',
        ``,
        `위 상품의 한국 시장 모바일 상세페이지 outline 을 JSON 으로.`,
    ].filter(Boolean).join('\n');

    const res = await anthropic.messages.create({
        model: CLAUDE_OPUS,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
    });

    const text = res.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text).join('\n').trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Claude 응답에서 JSON 못 찾음: ' + text.slice(0, 200));

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedPageOutline;
    if (!Array.isArray(parsed.sections) || parsed.sections.length === 0) {
        throw new Error('outline 의 sections 가 비어있음');
    }
    return {
        overallTone: parsed.overallTone || 'casual',
        targetMobile: parsed.targetMobile !== false,
        sections: parsed.sections.map(s => ({
            type: (['hero', 'feature_list', 'comparison', 'usage', 'social_proof', 'cta'] as const)
                .includes(s.type) ? s.type : 'feature_list',
            headline: String(s.headline || ''),
            body: String(s.body || ''),
            cta: s.cta ? String(s.cta) : undefined,
            imagePrompt: s.imagePrompt ? String(s.imagePrompt) : undefined,
            preview: s.preview ? String(s.preview) : undefined,
        })),
    };
}
