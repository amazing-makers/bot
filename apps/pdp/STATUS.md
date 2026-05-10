# pdpbot 진행 상황

**최종 갱신:** 2026-05-10

---

## 완료 (Phase 1.1 scaffold)

| commit | 내용 |
|---|---|
| `d53d5db` | apps/pdp scaffold — README + ROADMAP + Next.js + 첫 페이지 + /api/extract |
| `982026c` | Prisma schema (User 공유 + pdp 전용 + Credit) + auth (SSO) + credit helper |
| `529ec60` | NAMING + 모노레포 README + MIGRATION 강화 |

## 동작 가능

- `/api/extract` — URL → og:image + 큰 img 태그 자동 추출 (쿠팡·타오바오·1688·아마존·네이버·generic)
- 첫 페이지 (Hero + URL 입력 + 결과 갤러리 + 워크플로우 가이드)

## 진행 중 — Phase 1.2 핵심 기능

목표: 갤러리에서 이미지 1장 클릭 → 글자 자동 제거 → 한국어 합성 → 다운로드.

### 작업 list

- [ ] `lib/ai/openai.ts` — OpenAI client (GPT-4 Vision)
- [ ] `lib/ai/anthropic.ts` — Anthropic client (Claude Opus 4.7)
- [ ] `lib/ai/replicate.ts` — Replicate client (FLUX 1.1 Pro Fill)
- [ ] `lib/pipeline/ocr.ts` — 이미지 → 텍스트 영역 (bbox + 원문) 배열
- [ ] `lib/pipeline/inpaint.ts` — 마스크 + FLUX 1.1 Pro Fill → 글자 지운 이미지
- [ ] `lib/pipeline/translate.ts` — 텍스트 → Claude Opus 한국어 번역
- [ ] `lib/pipeline/compose.ts` — Sharp + 한글 폰트 → 인페인팅된 이미지에 번역 텍스트 배치
- [ ] `lib/storage/r2.ts` — Cloudflare R2 업로드 (마케팅봇과 같은 패턴)
- [ ] `/api/process` — 이미지 1장 통합 처리 endpoint (OCR → 인페인팅 → 번역 → 합성 → R2 → DB)
- [ ] UI — 이미지 클릭 시 modal: 진행 상황 (4단계 progress) + before/after 비교 + 텍스트 수정 후 재합성 + PNG 다운로드
- [ ] Credit 차감 wiring — 각 단계마다 `spendCredits` 호출 (잔액 부족 시 결제 페이지 안내)

### 환경변수 (Phase 1.2 작업 시 필요)

```
OPENAI_API_KEY=sk-...           # GPT-4 Vision (5 credits/장)
ANTHROPIC_API_KEY=sk-ant-...    # Claude Opus (5 credits/번역)
REPLICATE_API_TOKEN=r8_...      # FLUX 1.1 Pro Fill (30 credits/장)
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=amakers-pdp
R2_PUBLIC_URL=https://cdn.amakers.co.kr  # 또는 r2.dev
```

## 보류 (Phase 1.3+)

- 사이트별 specialized scrapers (현재 generic 만)
- Playwright 동적 렌더링 (lazy load 사이트)
- 캐러셀 이미지 발행 (단일 이미지/비디오만 v1)

## Phase 2 이후

[ROADMAP.md](./ROADMAP.md) 참조.

## 다음 세션 시작 시

1. `npx prisma migrate dev --name pdp_initial` (운영 DB 에 새 테이블 추가) — 사용자님이 한 번
2. `lib/ai/*` 파일부터 작성 (위 작업 list 순서대로)
3. 각 단계마다 commit + push
