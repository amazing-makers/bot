/**
 * OCR pipeline — GPT-4 Vision 으로 이미지 안 텍스트 영역 추출.
 *
 * 출력: TextRegion[] = [{ bboxX, bboxY, bboxW, bboxH, originalText, sourceLanguage }]
 *   bbox 는 0~1 비율 (이미지 width/height 기준).
 *
 * 사용 모델: gpt-4o (vision 지원). 응답을 JSON 으로 강제 (response_format: json_object).
 */

import { getOpenAI, OPENAI_VISION_MODEL } from '../ai/openai';

export interface DetectedRegion {
    bboxX: number;        // 0~1
    bboxY: number;
    bboxW: number;
    bboxH: number;
    originalText: string;
    sourceLanguage?: string; // 'zh' | 'en' | 'ja' | 'ko' 등 (자동 감지)
}

const SYSTEM_PROMPT = `너는 이미지 안의 텍스트를 정확히 탐지해 위치(bbox)와 내용을 JSON 으로 반환하는 도구야.
규칙:
1) 이미지 안의 모든 텍스트 (한국어/중국어/영어/일본어/숫자 등) 를 찾아라.
2) 각 텍스트 영역마다 bbox 를 이미지 전체 크기에 대한 비율 (0.0~1.0) 으로 반환:
   - x: 영역 좌상단 x 좌표 ÷ 이미지 width
   - y: 영역 좌상단 y 좌표 ÷ 이미지 height
   - w: 영역 width ÷ 이미지 width
   - h: 영역 height ÷ 이미지 height
3) bbox 는 텍스트 주변에 5~10px 여백을 포함해 약간 넉넉하게 (인페인팅 마스크용).
4) 가까이 붙어 같은 의미를 형성하는 단어들은 하나의 region 으로 묶어라 (예: "全场满 199 减 30").
5) 너무 작은 (bbox.w < 0.02 또는 bbox.h < 0.015) 노이즈 텍스트는 무시.
6) sourceLanguage 는 ISO 639-1 코드 ('zh', 'en', 'ko', 'ja', 'es' 등). 모르면 'unknown'.

응답은 반드시 다음 JSON schema:
{
  "regions": [
    { "bboxX": 0.05, "bboxY": 0.10, "bboxW": 0.30, "bboxH": 0.04, "originalText": "...", "sourceLanguage": "zh" },
    ...
  ]
}`;

/**
 * 이미지 URL → 텍스트 영역 list 추출.
 * imageUrl 은 public 접근 가능해야 (R2 또는 외부 사이트 직접 URL).
 */
export async function detectTextRegions(imageUrl: string): Promise<DetectedRegion[]> {
    const openai = getOpenAI();
    const res = await openai.chat.completions.create({
        model: OPENAI_VISION_MODEL,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: [
                    { type: 'text', text: '이 이미지에서 모든 텍스트를 탐지해 JSON 으로 반환해줘.' },
                    { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
                ],
            },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
        max_tokens: 4000,
    });

    const text = res.choices[0]?.message?.content;
    if (!text) return [];

    try {
        const parsed = JSON.parse(text) as { regions?: DetectedRegion[] };
        const regions = Array.isArray(parsed.regions) ? parsed.regions : [];
        // 검증 — bbox 값이 0~1 범위
        return regions
            .filter(r =>
                typeof r.bboxX === 'number' && r.bboxX >= 0 && r.bboxX <= 1 &&
                typeof r.bboxY === 'number' && r.bboxY >= 0 && r.bboxY <= 1 &&
                typeof r.bboxW === 'number' && r.bboxW > 0 && r.bboxW <= 1 &&
                typeof r.bboxH === 'number' && r.bboxH > 0 && r.bboxH <= 1 &&
                typeof r.originalText === 'string' && r.originalText.trim().length > 0,
            )
            .map(r => ({
                bboxX: r.bboxX,
                bboxY: r.bboxY,
                bboxW: r.bboxW,
                bboxH: r.bboxH,
                originalText: r.originalText.trim(),
                sourceLanguage: r.sourceLanguage,
            }));
    } catch {
        return [];
    }
}
