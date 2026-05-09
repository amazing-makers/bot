# apps/pdp — pdpbot (Product Detail Page Bot)

**도메인:** pdpbot.amakers.co.kr (예정)
**한 줄 가치:** 쿠팡·타오바오 URL 1개 → 한국어 상세페이지 자동 완성. **8시간 → 5분.**

## 사용자 페인 포인트

해외/국내 셀러가 상세페이지 만들 때 가장 시간 쓰는 작업:
1. 타오바오·1688·아마존 등에서 이미지 받기
2. 이미지 안 중국어/영어 글자 다 지우기
3. 그 자리에 한국어 번역해서 디자인에 어울리게 다시 넣기
4. 비슷한 상품 분석해서 더 좋은 상세페이지 새로 만들기
5. 쿠팡·네이버 스마트스토어에 등록

전부 수작업 = 1상품당 8시간+. pdpbot 으로 5분.

## 5개 기능 영역

| | 영역 | Phase |
|---|---|---|
| A | **소스 추출**: 쿠팡·네이버·타오바오·1688·아마존 URL → 이미지·문구 자동 다운 | Phase 1 |
| B | **이미지 글자 제거**: OCR + 인페인팅으로 자연스럽게 제거 | Phase 1 |
| C | **번역 + 재합성**: 자동 번역 또는 사용자 문구 → 디자인 합성 | Phase 1 |
| D | **신규 디자인**: 비슷한 상품 AI 분석 → 구조·문구·이미지 통째로 생성 | Phase 2-3 |
| E | **채널 업로드**: 쿠팡·네이버 스마트스토어·11번가 자동 등록 | Phase 4 |

## 기술 스택 (현존 최고 AI 조합)

| 작업 | AI |
|---|---|
| OCR (텍스트 위치+내용) | **GPT-4 Vision** + PaddleOCR fallback |
| 인페인팅 (글자 제거) | **FLUX 1.1 Pro Fill** (Replicate) |
| 번역 | **Claude Opus 4.7** |
| 신규 이미지 생성 | **FLUX 1.1 Pro** (사진), **DALL-E 3** (텍스트 합성) |
| 상품/키워드 분석 | **Claude Opus 4.7** |
| 사이트 스크래핑 | Playwright (이미 마케팅봇 에이전트 인프라 있음) |

## 프레임워크

- Next.js 16 (Turbopack) + React 19
- Mantine v9 (UI)
- Prisma 7.8 + PostgreSQL (Supabase, 마케팅봇과 공유 DB 또는 별도)
- NextAuth v5 beta (`@amakers/auth` 공유 패키지)
- AI 어댑터: OpenAI · Anthropic · Replicate · DeepL

## 의존 공유 패키지

- `@amakers/auth` — NextAuth + 사용자/워크스페이스
- `@amakers/db` — Prisma client (마케팅봇과 동일 DB / 다른 schema)
- `@amakers/ui` — Mantine + amakers 브랜드 토큰
- `@amakers/billing` — 사용량 기반 과금 (이미지 1개당 X원 등)
- `@amakers/types` — 공통 type

## Phase 별 마일스톤

`ROADMAP.md` 참조.

## 시작

```bash
cd c:\amakers-platform\apps\pdp
npm install   # workspace deps 자동
npm run dev   # http://localhost:3001 (또는 다른 포트)
```
