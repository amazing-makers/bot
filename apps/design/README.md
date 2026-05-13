# apps/design — designbot (designbot.amakers.co.kr)

**비유:** Canva·미리캔버스 의 한국 셀러 특화 + AI 자동화 버전.
**범위:** Figma/Photoshop "급" 아님 — 셀러가 실제로 자주 쓰는 광고/SNS 디자인에 집중.

## Phase 1 (MVP, 현재) — 기본 캔버스 에디터

- ✅ Konva.js 기반 캔버스 (텍스트·도형·이미지·선 추가/드래그/리사이즈/회전)
- ✅ 레이어 패널 (보이기/잠금/순서)
- ✅ 속성 패널 (색·폰트·테두리 등)
- ✅ Undo/Redo (50 단계)
- ✅ 키보드 단축키 (Ctrl+Z/D/Delete)
- ✅ 한국 셀러 표준 사이즈 5종 (인스타 정사각/스토리, 쿠팡 메인, 네이버 배너, 카드뉴스)
- ✅ PNG export (다운로드 + 썸네일 자동 저장)
- ✅ SSO (다른 봇과 같은 계정)
- ✅ 디자인 저장/불러오기 (Design 모델 + sceneJson)

## Phase 2 (예정) — AI 자동 생성

- Claude 가 layout 구성 + 카피 제안
- FLUX 가 배경 이미지 생성
- "프롬프트 → 디자인 완성" 흐름
- BYOK 지원 (pdpbot 패턴 재사용)

## Phase 3 (예정) — 브랜드 키트 + 템플릿

- 색상/로고/폰트 저장 + 재사용
- 사용자 템플릿 라이브러리
- 셀러 상품 카탈로그 자동 생성

## Phase 4 (예정) — 다른 봇 연동

- pdpbot 의 상품 분석 → 자동 디자인 시드
- 마케팅봇으로 디자인 → SNS 자동 발행

## 기술 스택

- **Next.js 16** + **Mantine 9** + **react-konva 18**
- **Zustand** (캔버스 state)
- **Sharp** (서버 측 썸네일 리사이즈)
- **Pretendard otf 임베드** (Vercel 한글 렌더링)
- **Prisma 7** + **Supabase** (공유 DB)
- **Cloudflare R2** (썸네일 + 업로드 이미지)

## 개발

```bash
cd c:\amakers-platform
npm install
cd apps/design
copy .env.example .env.local
# .env.local 채우기 (DATABASE_URL, NEXTAUTH_SECRET, API_KEY_ENCRYPTION_SECRET, R2_*)
npx prisma generate
npx prisma db push   # Design 테이블 추가
npm run dev          # http://localhost:3300
```

## 비용 (Phase 1 기준)

- 디자인 생성/저장 — **무료**
- PNG export — **무료** (Phase 2 부터 R2 저장 1 credit 가능)
- Phase 2 AI 자동 생성 — ~25 credits / 1 디자인 (예정)
