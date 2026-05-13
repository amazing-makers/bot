/**
 * Phase 2.1 — Claude Opus 가 prompt 받아 Scene JSON 생성.
 *
 * 입력:
 *   - prompt: 사용자 자연어 ("20대 여성 화장품 인스타 광고 — 봄 신상품")
 *   - canvas: { width, height, format ('instagram_square' 등) }
 *   - brandColors?: ['#...', '#...']  (옵션)
 *   - backgroundImageUrl?: string      (Phase 2.2 의 FLUX 결과)
 *
 * 출력:
 *   완전한 Scene — { background, elements: [...] } — DesignElement 스펙 준수.
 *
 * Claude 가 다음을 결정:
 *   - 전체 layout (어디에 어떤 요소)
 *   - 한국어 카피 (헤드라인, 본문, CTA)
 *   - 색상 (brandColors 우선, 없으면 prompt 톤에 맞춰)
 *   - 폰트 크기 (반응형 — 캔버스 크기 비례)
 *
 * 비용: ~10 credits (Claude Opus text only).
 */

import { getAnthropic, CLAUDE_OPUS } from '../ai/anthropic';
import type { Scene, DesignElement, TextElement, RectElement, CircleElement, ImageElement } from '../design/types';

interface GenerateInput {
    prompt: string;
    canvasWidth: number;
    canvasHeight: number;
    canvasFormat: string;
    brandColors?: string[];
    backgroundImageUrl?: string;
    userAnthropicKey?: string | null;
}

const SYSTEM_PROMPT = `너는 한국 셀러를 위한 디자인 자동 생성기야.
사용자가 자연어 요청을 보내면 모바일/SNS 광고용 디자인 Scene 을 JSON 으로 반환.

응답은 반드시 다음 schema 의 JSON 만 (markdown · 설명 X):
{
  "background": "#hexcolor",
  "elements": [
    {
      "type": "rect" | "circle" | "text" | "image",
      "x": number,         // 캔버스 왼쪽 상단 기준 절대 좌표 (px)
      "y": number,
      "rotation": 0,
      "opacity": 1,
      // type === "rect":
      "width": number, "height": number, "fill": "#hex", "stroke"?: "#hex", "strokeWidth": 0, "cornerRadius": 0
      // type === "circle":
      "radius": number, "fill": "#hex", "stroke"?: "#hex", "strokeWidth": 0
      // type === "text":
      "text": "한국어 카피", "fontSize": number,
      "fontStyle": "normal" | "bold" | "italic" | "bold italic",
      "fill": "#hex", "width": number, "align": "left" | "center" | "right",
      "letterSpacing": 0, "lineHeight": 1.3
      // type === "image":  (오직 1개 — background 또는 product image)
      "src": "<URL>", "width": number, "height": number, "fit": "cover"
    }
  ]
}

설계 규칙:
1) **레이아웃 - 모바일 우선**: 캔버스 폭의 8~10% 를 좌우 padding 으로.
2) **요소 개수**: 4~8개 (배경 + 헤드라인 + 본문/특징 + CTA 버튼 + 강조 도형 등).
3) **폰트 크기 - 캔버스 비례**:
   - 헤드라인: 캔버스 width × 0.07~0.10 (예: 1080px → 75~108)
   - 본문:     캔버스 width × 0.025~0.035
   - 작은 텍스트: 캔버스 width × 0.018
4) **z-order**: elements 배열 순서가 z-order. 배경/도형 먼저 → 텍스트 나중.
5) **한국어 마케팅 톤**: 짧고 임팩트 있게. 이모지·해시태그 가능.
6) **색상**: brandColors 있으면 거기서 1~2개 + 보색/대비색. 없으면 prompt 톤 (예: '봄' → 파스텔, '럭셔리' → 검정/금).
7) **background image** 있으면 elements 의 첫 element 로 type:"image" + 캔버스 전체 크기 + fit:"cover".
   추가 도형/텍스트는 그 위에 readable (반투명 overlay rect 사용 가능).
8) **width/height 모든 도형은 정수**, **fontSize 도 정수**.
9) **모든 hex 색상은 # 포함 7자 형식** (예: "#1a1a1a", "#fff" 는 ❌ → "#ffffff").
10) **CTA 버튼**: rect (배경) + text (위에 겹쳐). 텍스트 align: "center", text width = rect width.`;

/** Claude 응답에서 JSON 추출 + 검증 + 정규화. */
function parseScene(text: string, canvasWidth: number, canvasHeight: number, fallbackBg: string): Scene {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Claude 응답에서 JSON 못 찾음: ' + text.slice(0, 200));

    let parsed: any;
    try {
        parsed = JSON.parse(match[0]);
    } catch (e: any) {
        throw new Error('Claude JSON 파싱 실패: ' + e.message);
    }

    const elements: DesignElement[] = [];
    for (const raw of parsed.elements || []) {
        const el = normalizeElement(raw);
        if (el) elements.push(el);
    }

    return {
        width: canvasWidth,
        height: canvasHeight,
        background: typeof parsed.background === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.background)
            ? parsed.background
            : fallbackBg,
        elements,
    };
}

function normalizeElement(raw: any): DesignElement | null {
    if (!raw || typeof raw !== 'object') return null;
    const id = crypto.randomUUID();
    const base = {
        id,
        x: Number(raw.x) || 0,
        y: Number(raw.y) || 0,
        rotation: Number(raw.rotation) || 0,
        opacity: typeof raw.opacity === 'number' ? raw.opacity : 1,
        visible: true,
        locked: false,
    };

    switch (raw.type) {
        case 'rect':
            return {
                ...base, type: 'rect',
                width: Math.max(1, Number(raw.width) || 100),
                height: Math.max(1, Number(raw.height) || 100),
                fill: hexOr(raw.fill, '#cccccc'),
                stroke: raw.stroke ? hexOr(raw.stroke, undefined) : undefined,
                strokeWidth: Number(raw.strokeWidth) || 0,
                cornerRadius: Number(raw.cornerRadius) || 0,
            } satisfies RectElement;
        case 'circle':
            return {
                ...base, type: 'circle',
                radius: Math.max(1, Number(raw.radius) || 50),
                fill: hexOr(raw.fill, '#cccccc'),
                stroke: raw.stroke ? hexOr(raw.stroke, undefined) : undefined,
                strokeWidth: Number(raw.strokeWidth) || 0,
            } satisfies CircleElement;
        case 'text':
            return {
                ...base, type: 'text',
                text: String(raw.text || '텍스트'),
                fontSize: Math.max(8, Number(raw.fontSize) || 32),
                fontFamily: "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
                fontStyle: ['normal', 'bold', 'italic', 'bold italic'].includes(raw.fontStyle) ? raw.fontStyle : 'bold',
                fill: hexOr(raw.fill, '#1a1a1a'),
                width: Math.max(20, Number(raw.width) || 300),
                align: ['left', 'center', 'right'].includes(raw.align) ? raw.align : 'left',
                letterSpacing: Number(raw.letterSpacing) || 0,
                lineHeight: typeof raw.lineHeight === 'number' ? raw.lineHeight : 1.3,
            } satisfies TextElement;
        case 'image':
            if (!raw.src) return null;
            return {
                ...base, type: 'image',
                src: String(raw.src),
                width: Math.max(10, Number(raw.width) || 200),
                height: Math.max(10, Number(raw.height) || 200),
                fit: ['fill', 'contain', 'cover'].includes(raw.fit) ? raw.fit : 'cover',
            } satisfies ImageElement;
        default:
            return null;
    }
}

function hexOr(v: any, fallback: string | undefined): any {
    if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) return v;
    if (typeof v === 'string' && /^#[0-9a-f]{3}$/i.test(v)) {
        // #abc → #aabbcc 확장
        return '#' + v.slice(1).split('').map(c => c + c).join('');
    }
    return fallback;
}

export async function generateDesignScene(opts: GenerateInput): Promise<Scene> {
    const anthropic = getAnthropic(opts.userAnthropicKey);

    const userPrompt = [
        `요청: ${opts.prompt}`,
        ``,
        `캔버스: ${opts.canvasWidth}×${opts.canvasHeight}px (${opts.canvasFormat})`,
        opts.brandColors && opts.brandColors.length > 0
            ? `브랜드 색상 (우선 사용): ${opts.brandColors.join(', ')}`
            : '',
        opts.backgroundImageUrl
            ? `배경 이미지 (첫 element 로 포함, 캔버스 전체 크기): ${opts.backgroundImageUrl}`
            : '',
        ``,
        `위 요청에 맞는 디자인 Scene JSON 만 반환. 설명·markdown X.`,
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

    return parseScene(text, opts.canvasWidth, opts.canvasHeight, '#ffffff');
}
