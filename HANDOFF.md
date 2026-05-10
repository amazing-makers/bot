# amakers-platform 진행 기록 (Session Handoff)

**최종 갱신:** 2026-05-07
**다음 세션 진입 시 이 파일 먼저 읽기.**

---

## 큰 그림

| 봇 | 상태 | 다음 마일스톤 |
|---|---|---|
| 어드민봇 | ✅ 운영 | (안정 운영) |
| 마케팅봇 | ✅ 운영 (별도 레포) | Phase 50 backlog 정리, MIGRATION 완료 후 합류 |
| **pdpbot** | ✅ **Phase 1~3 완료** | **Phase 4 채널 자동 업로드 (쿠팡/네이버) 또는 사용자 베타 테스트** |
| 디자인봇 | 📝 README only | pdpbot 완성 후 |
| 모형봇 | 📝 미시작 | 후 |

## pdpbot 진행 현황

**완료 기능 (커밋 `e873a45` 기준):**
- ✅ Phase 1: URL 입력 → 스크래핑 → OCR → 인페인팅 → 번역 → 합성 → R2 저장 (~41 credits)
- ✅ Phase 1.5: 텍스트 사용자 수정 후 재합성 (1 credit, 인페인팅 재사용)
- ✅ Phase 2.1: AI 상품 자동 분석 (10 credits, Claude Opus Vision)
- ✅ **Phase 3.1**: 신규 상세페이지 outline 자동 생성 (5 credits, Claude Opus)
- ✅ **Phase 3.2**: 섹션별 이미지 자동 생성 (20 credits/섹션, FLUX 1.1 Pro)
- ✅ **Phase 3.3**: 섹션 합성 1장 PNG (1 credit, Sharp) — 쿠팡·네이버 직접 업로드 가능
- ✅ Stripe 결제 + Credit billing 대시보드
- ✅ Site-specific scrapers (Coupang, Taobao, 1688, Generic OG)

**Phase 3 풀 비용 (8개 섹션 기준):** 5 + 8×20 + 1 = 166 credits ≈ ₩16,600
**Phase 1 + Phase 3 풀 비용:** 약 207 credits ≈ ₩20,700

**BYOK 모드 (사용자 직접 키 입력):**
- `/dashboard/api-keys` → OpenAI/Anthropic/Replicate 키 입력 → 해당 호출 credit 0
- 캐주얼 유저 = 운영자 키 + Credit (간편)
- 헤비 유저 = BYOK (월 1000+ 상품 시 ~50% 비용 절감)
- 키는 AES-256-GCM 암호화 (`API_KEY_ENCRYPTION_SECRET` env 필요)

**다음 후보:**
- Phase 4: 채널 자동 업로드 (쿠팡 Wing API, 네이버 Smartstore API)
- Phase 2.2: 키워드 검색량 분석 (네이버 DataLab API)
- 사용자 베타 테스트 + 피드백 반영

## pdpbot 우선 작업

→ [apps/pdp/STATUS.md](./apps/pdp/STATUS.md) 에서 detail 추적.

## 정리된 문서 (참고 순)

| 파일 | 내용 |
|---|---|
| [README.md](./README.md) | 모노레포 전체 그림 |
| [NAMING.md](./NAMING.md) | 명칭 컨벤션 + 새 봇 추가 12-step |
| [DEPLOY_PLAN.md](./DEPLOY_PLAN.md) | 멀티봇 배포 청사진 (도메인 / SSO / Credit) |
| [MIGRATION.md](./MIGRATION.md) | 마케팅봇 → apps/marketing 합류 10-step |
| [apps/pdp/README.md](./apps/pdp/README.md) | pdpbot 비전 + 5개 영역 (A~E) |
| [apps/pdp/ROADMAP.md](./apps/pdp/ROADMAP.md) | pdpbot Phase 1~5 마일스톤 |
| [apps/pdp/STATUS.md](./apps/pdp/STATUS.md) | pdpbot 현재 진행 상황 |

## 마케팅봇 별도 레포 진행 기록

→ `c:\marketingbot\PHASE_50_BACKLOG.md` 참조 (인스타 OAuth setup 운영자 액션 대기 등).

## 핵심 의사결정 (확정)

| 결정 | 값 |
|---|---|
| DB | 모든 봇 같은 Supabase 공유. 같은 User 테이블. |
| SSO | 쿠키 도메인 `.amakers.co.kr` 공유 — 한 번 로그인 → 모든 봇. |
| 인증 secret | 같은 `NEXTAUTH_SECRET` 모든 봇. |
| 결제 | Credit 잔액 기반. 패키지 구독 + 일회성 충전. 모든 봇 같은 잔액. |
| 봇별 프로젝트 | Vercel 별도 프로젝트 (Root Directory 분리). subdomain 별도. |
| AI 스택 (pdpbot) | OCR=GPT-4 Vision, 인페인팅=FLUX 1.1 Pro Fill, 번역=Claude Opus 4.7, 신규 이미지=FLUX/DALL-E 3 |

## 운영자 액션 대기 (사용자님)

### 마케팅봇
- [ ] Meta Developer App 등록 (Instagram OAuth)
- [ ] Vercel env: META_APP_ID, META_APP_SECRET
- [ ] Meta App Review 신청 (일반 사용자에게 공개 전)

### pdpbot
- [ ] (Phase 1.2 완성 후) Vercel 새 프로젝트 `pdpbot` 생성
- [ ] Vercel env: DATABASE_URL, NEXTAUTH_SECRET (마케팅봇과 동일), OPENAI_API_KEY, ANTHROPIC_API_KEY, REPLICATE_API_TOKEN
- [ ] Cloudflare DNS: `pdpbot.amakers.co.kr` → cname.vercel-dns.com

### 마케팅봇 합류 (별도 일정)
- [ ] [MIGRATION.md](./MIGRATION.md) 의 10 step

## 다음 세션 시작 시

1. 이 파일 읽기 (현재 상황 파악)
2. [apps/pdp/STATUS.md](./apps/pdp/STATUS.md) 읽기 (pdp 작업 중인 부분)
3. 다음 후보:
   - **Phase 4** 채널 자동 업로드 — 쿠팡 Wing API + 네이버 Smartstore API 연동
   - **Phase 2.2** 키워드 검색량 (네이버 DataLab) — Phase 2.1 분석에 검색량 데이터 추가
   - **사용자 베타 피드백 반영** — 사용자가 setup 완료 후 직접 테스트한 결과에 따라 우선순위 조정
