# apps/design — designbot (designbot.amakers.co.kr)

**비유:** Canva·미리캔버스 의 한국 셀러 특화 + AI 자동화 버전.  
**범위:** Figma/Photoshop "급" 아님 — 셀러가 실제로 자주 쓰는 광고/SNS 디자인에 집중.

## 구현 현황

### ✅ Phase 1 — 기본 캔버스 에디터
- Konva.js 기반 캔버스 (텍스트·도형·이미지·선 추가/드래그/리사이즈/회전)
- 레이어 패널 (보이기/잠금/순서) + 속성 패널
- Undo/Redo (50 단계), 키보드 단축키 (Ctrl+Z/D/Delete)
- 한국 셀러 표준 사이즈 5종 (인스타 정사각/스토리, 쿠팡 메인, 네이버 배너, 카드뉴스)
- PNG export (다운로드 + 썸네일 R2 저장), SSO

### ✅ Phase 2 — AI 자동 생성
- Claude Opus → layout JSON 생성 (헤드라인·CTA·색상 자동)
- FLUX 1.1 Pro → 배경 이미지 생성 (옵션)
- BYOK 지원 (Anthropic/Replicate 키 직접 입력 → 0 credit)
- 10 credits (layout) + 20 credits (배경 이미지)

### ✅ Phase 3 — 브랜드 키트
- BrandKit 모델 (colors[], logoUrl, isDefault)
- AI 생성 시 기본 브랜드 키트 자동 적용
- /dashboard/brand 관리 페이지

### ✅ Phase 4 — 크로스봇 연동 + 템플릿
- **pdpbot → designbot**: 상품 분석 결과 → `POST /api/designs/from-product` → 자동 광고 디자인 생성
- **템플릿 시스템**: 현재 디자인 → 템플릿 저장 / 대시보드 템플릿 갤러리 / 재사용
- **이미지 URL 복사**: 에디터 ⋯ 메뉴 → PNG URL 복사 → 마케팅봇·SNS 채널 직접 붙여넣기
- CORS 미들웨어 (pdpbot 크로스오리진 허용)

## 기술 스택

- **Next.js 16** + **Mantine 9** + **react-konva 18**
- **Zustand** (캔버스 state)
- **Sharp** (서버 측 썸네일 리사이즈)
- **Prisma 7** + **Supabase** (공유 DB — pdpbot 의 Product 모델 공유)
- **Cloudflare R2** (썸네일 + 업로드 이미지)

## 개발 환경 설정

```bash
cd c:\amakers-platform
npm install
cd apps/design
copy .env.example .env.local
# .env.local 채우기 (DATABASE_URL, NEXTAUTH_SECRET, API_KEY_ENCRYPTION_SECRET, R2_*)
npx prisma generate
npx prisma db push   # DesignTemplate + Design.sourceProductId 마이그레이션
npm run dev          # http://localhost:3300
```

## API 엔드포인트 (Phase 4)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/designs/from-product` | pdpbot 상품 ID → 자동 디자인 생성 (10cr) |
| GET  | `/api/templates` | 내 템플릿 + 공개 템플릿 목록 |
| POST | `/api/templates` | 현재 디자인 → 템플릿 저장 |
| POST | `/api/templates/[id]` | 템플릿으로 새 디자인 생성 |
| DELETE | `/api/templates/[id]` | 내 템플릿 삭제 |

## 비용 요약

| 기능 | 크레딧 |
|------|--------|
| 캔버스 편집/저장/export | 무료 |
| AI 레이아웃 생성 (Claude) | 10 cr |
| 배경 이미지 생성 (FLUX) | 20 cr |
| 상품 분석 → 자동 디자인 | 10 cr |
| 템플릿 저장/사용 | 무료 |
