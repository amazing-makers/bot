/**
 * 디자인 캔버스 element 타입 정의.
 *
 * 모든 element 는 unique id + 공통 transform (x, y, rotation, opacity, ...) +
 * 타입별 고유 props 를 가짐. Konva 의 props 와 거의 1:1 매핑 — 변환 없이 렌더링.
 */

export type ElementType = 'rect' | 'circle' | 'text' | 'image' | 'line';

interface BaseElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    rotation: number;
    opacity: number;
    /** 가시성 토글 (Layers panel). */
    visible: boolean;
    /** 잠금 — 캔버스에서 선택·이동·삭제 불가. */
    locked: boolean;
}

export interface RectElement extends BaseElement {
    type: 'rect';
    width: number;
    height: number;
    fill: string;
    stroke?: string;
    strokeWidth: number;
    cornerRadius: number;
}

export interface CircleElement extends BaseElement {
    type: 'circle';
    radius: number;
    fill: string;
    stroke?: string;
    strokeWidth: number;
}

export interface TextElement extends BaseElement {
    type: 'text';
    text: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic';
    fill: string;
    width: number;
    /** 'left' | 'center' | 'right' */
    align: 'left' | 'center' | 'right';
    /** 자간. */
    letterSpacing: number;
    /** 줄간격 배수 (Konva lineHeight). */
    lineHeight: number;
}

export interface ImageElement extends BaseElement {
    type: 'image';
    /** R2 또는 외부 URL. dataURL 도 가능 (업로드 직후). */
    src: string;
    width: number;
    height: number;
    /** 'fill' | 'contain' — 이미지 컨테이너에서 잘림/맞춤 동작. */
    fit: 'fill' | 'contain' | 'cover';
}

export interface LineElement extends BaseElement {
    type: 'line';
    /** Konva points 형식: [x1, y1, x2, y2, ...]. 절대 좌표 (x/y 는 무시). */
    points: number[];
    stroke: string;
    strokeWidth: number;
}

export type DesignElement = RectElement | CircleElement | TextElement | ImageElement | LineElement;

/** 캔버스 전체 상태 — sceneJson 으로 DB 에 저장. */
export interface Scene {
    width: number;
    height: number;
    /** 배경색 (단색). 향후 gradient/image 지원 시 확장. */
    background: string;
    elements: DesignElement[];
}

/** 한국 셀러용 표준 사이즈 preset. */
export interface CanvasPreset {
    key: string;
    label: string;
    description: string;
    width: number;
    height: number;
    category: 'sns' | 'commerce' | 'ad';
}

export const CANVAS_PRESETS: CanvasPreset[] = [
    {
        key: 'instagram_square',
        label: '인스타그램 정사각',
        description: '피드용 — 1080×1080',
        width: 1080, height: 1080,
        category: 'sns',
    },
    {
        key: 'instagram_story',
        label: '인스타그램 스토리',
        description: '스토리/릴스 — 1080×1920',
        width: 1080, height: 1920,
        category: 'sns',
    },
    {
        key: 'coupang_main',
        label: '쿠팡 메인 이미지',
        description: '상품 대표 이미지 — 1000×1000',
        width: 1000, height: 1000,
        category: 'commerce',
    },
    {
        key: 'naver_banner',
        label: '네이버 배너',
        description: '스마트스토어 메인 배너 — 750×420',
        width: 750, height: 420,
        category: 'commerce',
    },
    {
        key: 'card_news',
        label: '카드뉴스',
        description: '여러 장 캐러셀 — 1080×1350',
        width: 1080, height: 1350,
        category: 'sns',
    },
];

export function getPresetByKey(key: string): CanvasPreset | undefined {
    return CANVAS_PRESETS.find(p => p.key === key);
}

/** 새 element 의 기본 값 생성 — element 추가 시 호출. */
export function makeDefaultElement(type: ElementType, opts: { x: number; y: number }): DesignElement {
    const id = crypto.randomUUID();
    const base = { id, x: opts.x, y: opts.y, rotation: 0, opacity: 1, visible: true, locked: false };

    switch (type) {
        case 'rect':
            return { ...base, type: 'rect', width: 200, height: 120, fill: '#7c3aed', strokeWidth: 0, cornerRadius: 8 };
        case 'circle':
            return { ...base, type: 'circle', radius: 80, fill: '#ec4899', strokeWidth: 0 };
        case 'text':
            return {
                ...base, type: 'text', text: '텍스트를 입력하세요', fontSize: 48,
                fontFamily: "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
                fontStyle: 'bold', fill: '#1a1a1a', width: 400, align: 'left',
                letterSpacing: 0, lineHeight: 1.3,
            };
        case 'image':
            return { ...base, type: 'image', src: '', width: 300, height: 200, fit: 'cover' };
        case 'line':
            return { ...base, type: 'line', points: [opts.x, opts.y, opts.x + 200, opts.y], stroke: '#1a1a1a', strokeWidth: 4 };
    }
}
