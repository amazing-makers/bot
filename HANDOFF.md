# amakers-platform 진행 기록 (Session Handoff)

**최종 갱신:** 2026-05-10
**다음 세션 진입 시 이 파일 먼저 읽기.**

---

## 큰 그림

| 봇 | 상태 | 다음 마일스톤 |
|---|---|---|
| 어드민봇 | ✅ 운영 | (안정 운영) |
| 마케팅봇 | ✅ 운영 (별도 레포) | Phase 50 backlog 정리, MIGRATION 완료 후 합류 |
| **pdpbot** | 🆕 Phase 1.1 scaffold ✅ | **Phase 1.2 핵심 기능 (현재 작업 중)** |
| 디자인봇 | 📝 README only | pdpbot 완성 후 |
| 모형봇 | 📝 미시작 | 후 |

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
3. 멈춰있던 todo 부터 이어가기 — 현재: **Phase 1.2 핵심 기능 (OCR + 인페인팅 + 번역 + 합성 + UI)**
