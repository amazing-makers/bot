/**
 * 한글 폰트 임베딩 헬퍼.
 *
 * 문제: Sharp(libvips) 가 SVG 의 한글 텍스트를 렌더링할 때, 시스템에 한글 폰트가 없으면
 * fallback 으로 □□□ (tofu) 출력. Vercel serverless 환경에는 한글 폰트가 기본 설치 없음.
 *
 * 해결: SVG 에 `<style>@font-face { src: url(data:font/otf;base64,...) }</style>` 를 prepend.
 * 폰트가 SVG 안에 임베드되어 시스템 fontconfig 와 무관하게 동작.
 *
 * 폰트 파일: apps/pdp/fonts/ (저장소에 commit, Vercel 배포 시 자동 포함).
 *
 * 비용: SVG 당 ~3MB 추가 (Pretendard-Regular + Bold base64). PNG 출력은 변하지 않음.
 *      합성 시간만 약간 증가 (~수백 ms).
 */

import { readFile } from 'fs/promises';
import path from 'path';

let cachedStyle: string | null = null;
let cacheError: Error | null = null;

/**
 * SVG 에 prepend 할 `<style>` 블록 반환.
 * 첫 호출 시 폰트 파일을 디스크에서 읽어 base64 로 캐시 (process 수명 동안 메모리 보관).
 *
 * 실패 시 빈 문자열 반환 — 한글이 깨지지만 SVG 자체는 동작 (안전한 fallback).
 */
export async function getKoreanFontStyle(): Promise<string> {
    if (cachedStyle) return cachedStyle;
    if (cacheError) return '';

    try {
        // process.cwd() 는 Vercel 에서 apps/pdp 를 가리킴 (vercel.json rootDirectory 기준).
        // 로컬 dev 에서도 같은 경로.
        const fontsDir = path.join(process.cwd(), 'fonts');

        const [regular, bold] = await Promise.all([
            readFile(path.join(fontsDir, 'Pretendard-Regular.otf')),
            readFile(path.join(fontsDir, 'Pretendard-Bold.otf')),
        ]);

        const regularB64 = regular.toString('base64');
        const boldB64 = bold.toString('base64');

        cachedStyle = `<style>
            @font-face {
                font-family: 'Pretendard';
                font-weight: 400 600;
                font-style: normal;
                src: url(data:font/otf;base64,${regularB64}) format('opentype');
            }
            @font-face {
                font-family: 'Pretendard';
                font-weight: 700 900;
                font-style: normal;
                src: url(data:font/otf;base64,${boldB64}) format('opentype');
            }
        </style>`;
        return cachedStyle;
    } catch (e: any) {
        cacheError = e;
        console.warn('[fonts] Pretendard 폰트 파일 읽기 실패 — 한글이 깨질 수 있음', e?.message);
        return '';
    }
}

/** 모든 한글 합성 SVG 에 들어갈 표준 font-family stack. */
export const KOREAN_FONT_FAMILY = "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif";
