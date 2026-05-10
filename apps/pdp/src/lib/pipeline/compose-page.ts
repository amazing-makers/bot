/**
 * Phase 3.3 — 생성된 outline + 섹션 이미지 → 모바일 상세페이지 1장 PNG 합성.
 *
 * 출력: 1080px 폭, 가변 높이 PNG. 쿠팡/네이버 등에 그대로 업로드 가능한 한 장 이미지.
 *
 * 각 섹션 layout:
 *   ┌───────────────────────────────────────┐
 *   │   [섹션 이미지 1080×H if generated]     │
 *   │                                       │
 *   │   섹션 헤드라인 (큼, 굵게)               │
 *   │                                       │
 *   │   섹션 본문 (보통, 회색)                  │
 *   │                                       │
 *   │   [ CTA ] 배지 (옵션)                   │
 *   └───────────────────────────────────────┘
 *
 * 섹션 사이 24px 간격 (구분선 또는 흰 여백).
 *
 * 비용: 0 credits — 사용된 자원만 사용 (Sharp local 합성).
 *
 * 폰트: Pretendard 권장 (compose.ts 와 동일 family stack).
 */

import sharp from 'sharp';
import { fetchAsBuffer } from '../storage/r2';
import type { GeneratedPageOutline, PageSection } from './generate-outline';
import { getKoreanFontStyle, KOREAN_FONT_FAMILY } from './fonts';
import { escapeXml, estimateTextWidth, wrapText } from './compose';

const PAGE_WIDTH = 1080;
const PADDING_X = 48;
const SECTION_GAP = 32;
const HEADLINE_FONT_SIZE = 44;
const BODY_FONT_SIZE = 28;
const CTA_FONT_SIZE = 32;
const FONT_FAMILY = KOREAN_FONT_FAMILY;

interface SectionWithImage extends PageSection {
    generatedImageUrl?: string;
}

interface RenderedSection {
    /** SVG 렌더링된 텍스트 영역 buffer (PAGE_WIDTH 폭). */
    textBuffer: Buffer;
    textHeight: number;
    /** 섹션 이미지 buffer (있으면). PAGE_WIDTH 로 정규화됨. */
    imageBuffer?: Buffer;
    imageHeight?: number;
}

/**
 * 단일 섹션 → 텍스트 영역 SVG → PNG buffer + 높이.
 */
async function renderSectionText(section: PageSection): Promise<{ buffer: Buffer; height: number }> {
    const innerWidth = PAGE_WIDTH - PADDING_X * 2;
    const fontStyle = await getKoreanFontStyle();

    const headlineLines = wrapText(section.headline || '', innerWidth, HEADLINE_FONT_SIZE);
    const bodyLines = wrapText(section.body || '', innerWidth, BODY_FONT_SIZE);

    const headlineLineHeight = HEADLINE_FONT_SIZE * 1.3;
    const bodyLineHeight = BODY_FONT_SIZE * 1.5;
    const ctaHeight = section.cta ? CTA_FONT_SIZE * 2.4 : 0;

    const topPad = 40;
    const bottomPad = 40;
    const gapHeadlineBody = 24;
    const gapBodyCta = 32;

    const totalHeight =
        topPad +
        headlineLines.length * headlineLineHeight +
        (bodyLines.length > 0 ? gapHeadlineBody + bodyLines.length * bodyLineHeight : 0) +
        (section.cta ? gapBodyCta + ctaHeight : 0) +
        bottomPad;

    const ctaColor = sectionTypeColor(section.type);

    let y = topPad + HEADLINE_FONT_SIZE;
    const headlineSvg = headlineLines
        .map(line => {
            const t = `<text x="${PADDING_X}" y="${y}" font-family="${FONT_FAMILY}" font-size="${HEADLINE_FONT_SIZE}" font-weight="800" fill="#1a1a1a">${escapeXml(line)}</text>`;
            y += headlineLineHeight;
            return t;
        })
        .join('\n');

    if (bodyLines.length > 0) y += gapHeadlineBody - headlineLineHeight + BODY_FONT_SIZE;
    const bodySvg = bodyLines
        .map(line => {
            const t = `<text x="${PADDING_X}" y="${y}" font-family="${FONT_FAMILY}" font-size="${BODY_FONT_SIZE}" font-weight="500" fill="#555">${escapeXml(line)}</text>`;
            y += bodyLineHeight;
            return t;
        })
        .join('\n');

    let ctaSvg = '';
    if (section.cta) {
        if (bodyLines.length > 0) y += gapBodyCta - bodyLineHeight;
        const ctaText = `[ ${section.cta} ]`;
        const ctaWidth = estimateTextWidth(ctaText, CTA_FONT_SIZE) + 48;
        const ctaX = PADDING_X;
        const ctaBgY = y - CTA_FONT_SIZE;
        ctaSvg = `
            <rect x="${ctaX}" y="${ctaBgY}" width="${ctaWidth}" height="${CTA_FONT_SIZE * 2}" rx="${CTA_FONT_SIZE}" fill="${ctaColor}" />
            <text x="${ctaX + 24}" y="${ctaBgY + CTA_FONT_SIZE * 1.35}" font-family="${FONT_FAMILY}" font-size="${CTA_FONT_SIZE}" font-weight="700" fill="#fff">${escapeXml(section.cta)}</text>
        `;
    }

    const svg = `<svg width="${PAGE_WIDTH}" height="${Math.ceil(totalHeight)}" xmlns="http://www.w3.org/2000/svg">
        ${fontStyle}
        <rect width="${PAGE_WIDTH}" height="${Math.ceil(totalHeight)}" fill="#ffffff" />
        ${headlineSvg}
        ${bodySvg}
        ${ctaSvg}
    </svg>`;

    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return { buffer, height: Math.ceil(totalHeight) };
}

function sectionTypeColor(type: PageSection['type']): string {
    switch (type) {
        case 'hero':         return '#7c3aed';
        case 'feature_list': return '#2563eb';
        case 'comparison':   return '#0d9488';
        case 'usage':        return '#ea580c';
        case 'social_proof': return '#db2777';
        case 'cta':          return '#dc2626';
        default:             return '#475569';
    }
}

/**
 * 모든 섹션 → 1장 PNG.
 *
 * @param outline    Product.metadata.generatedPage
 * @returns 합성된 PNG buffer + 최종 width/height
 */
export async function composeFullPage(
    outline: GeneratedPageOutline & { sections: SectionWithImage[] },
): Promise<{ buffer: Buffer; width: number; height: number }> {
    // 모든 섹션을 병렬로 렌더링 — text SVG + 섹션 이미지 fetch+resize 동시.
    // R2 fetch 6-9개 × 100-300ms 가 sequential 일 때 ~1-3초 → parallel 로 ~300ms.
    const rendered: RenderedSection[] = await Promise.all(
        outline.sections.map(async (section): Promise<RenderedSection> => {
            const [text, imagePart] = await Promise.all([
                renderSectionText(section),
                renderSectionImage(section),
            ]);
            return {
                textBuffer: text.buffer,
                textHeight: text.height,
                imageBuffer: imagePart?.buffer,
                imageHeight: imagePart?.height,
            };
        }),
    );

    let totalHeight = SECTION_GAP;
    for (const r of rendered) {
        if (r.imageBuffer && r.imageHeight) totalHeight += r.imageHeight;
        totalHeight += r.textHeight + SECTION_GAP;
    }

    const composites: sharp.OverlayOptions[] = [];
    let cursorY = SECTION_GAP;
    for (const r of rendered) {
        if (r.imageBuffer && r.imageHeight) {
            composites.push({ input: r.imageBuffer, top: cursorY, left: 0 });
            cursorY += r.imageHeight;
        }
        composites.push({ input: r.textBuffer, top: cursorY, left: 0 });
        cursorY += r.textHeight + SECTION_GAP;
    }

    const buffer = await sharp({
        create: { width: PAGE_WIDTH, height: totalHeight, channels: 3, background: { r: 255, g: 255, b: 255 } },
    }).composite(composites).png({ compressionLevel: 6 }).toBuffer();

    return { buffer, width: PAGE_WIDTH, height: totalHeight };
}

/** 섹션 이미지 fetch + 1080px resize. resolveWithObject 로 두 번째 sharp() 호출 제거. */
async function renderSectionImage(section: SectionWithImage): Promise<{ buffer: Buffer; height: number } | null> {
    if (!section.generatedImageUrl) return null;
    try {
        const raw = await fetchAsBuffer(section.generatedImageUrl);
        const { data, info } = await sharp(raw)
            .resize({ width: PAGE_WIDTH })
            .png()
            .toBuffer({ resolveWithObject: true });
        return { buffer: data, height: info.height };
    } catch (e) {
        console.warn('[composeFullPage] 섹션 이미지 fetch 실패, 텍스트만', e);
        return null;
    }
}

// (escapeXml / estimateTextWidth / wrapText 는 compose.ts 에서 import — 단일 source)
