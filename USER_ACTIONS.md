# 사용자님 (운영자) 액션 체크리스트

**최종 갱신:** 2026-05-10

> 코드/문서는 모두 정리됨. 사용자님이 직접 해야 할 것만 모음.
> 막히는 단계가 있으면 그 단계 번호 + 에러 메시지 알려주세요.

---

## 🟦 pdpbot (집중 작업 중)

### Phase 1.2 — 로컬 검증까지 (총 ~30분)

- [ ] **Step 1-1** OpenAI API 키 발급 + 카드 + $10 충전 → https://platform.openai.com/api-keys
- [ ] **Step 1-2** Anthropic API 키 발급 + 카드 + $10 충전 → https://console.anthropic.com/settings/keys
- [ ] **Step 1-3** Replicate API 키 발급 + 카드 + $10 충전 → https://replicate.com/account/api-tokens
- [ ] **Step 2** R2 bucket 5개 값 확인 (마케팅봇 .env.local 그대로 또는 새 bucket)
- [ ] **Step 3** `c:\amakers-platform\apps\pdp\.env.local` 작성 (`.env.example` 참조)
- [ ] **Step 3-1** BYOK 키 암호화 secret 생성 + .env.local 추가:
  ```powershell
  # PowerShell 에서 한 줄로 실행:
  $bytes = New-Object byte[] 32; (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes); ($bytes | %{$_.ToString("x2")}) -join ''
  ```
  결과 64자 hex 를 `API_KEY_ENCRYPTION_SECRET=` 뒤에 붙여넣기. 운영 배포 후 변경 X (변경 시 기존 사용자 BYOK 키 모두 무효화).
- [ ] **Step 4** PowerShell:
  ```powershell
  cd c:\amakers-platform\apps\pdp
  npx prisma generate
  npx prisma db push          # UserApiKey 테이블 등 schema 동기화
  ```
- [ ] **Step 5** credits 충전: `npm run seed:credits -- 1000`
- [ ] **Step 6** `npm run dev` → http://localhost:3200 → 이미지 1장 처리 테스트

→ 자세한 안내: [`apps/pdp/SETUP.md`](./apps/pdp/SETUP.md)

### Phase 1.3 — 운영 배포 (총 ~15분)

- [ ] **Step 7** Vercel → New Project → amazing-makers/bot → Root: `apps/pdp` → 환경변수 등록 (**`API_KEY_ENCRYPTION_SECRET` 포함**) → Deploy
- [ ] **Step 8** Cloudflare → DNS → CNAME `pdpbot` → `cname.vercel-dns.com` (DNS only)
- [ ] **Step 9** 운영 DB 본인 계정에 credits 충전 (5000+)

### Phase 1.4 — Stripe 결제 (운영 시작 전, 총 ~20분)

- [ ] **Stripe-1** https://dashboard.stripe.com/ 가입 → 비즈니스 정보 입력
- [ ] **Stripe-2** **Account → API keys** → **Secret key** 복사 (sk_test_... 또는 sk_live_...)
- [ ] **Stripe-3** **Developers → Webhooks → "+ Add endpoint"**:
  - URL: `https://pdpbot.amakers.co.kr/api/webhook/stripe`
  - Events: `checkout.session.completed` (1개)
  - **Add endpoint** → **Signing secret** (`whsec_...`) 복사
- [ ] **Stripe-4** Vercel pdpbot env vars:
  - `STRIPE_SECRET_KEY` (Sensitive)
  - `STRIPE_WEBHOOK_SECRET` (Sensitive)
- [ ] **Stripe-5** Vercel 재배포 → /pricing 접속 → 100 credits 패키지 결제 테스트
- [ ] **Stripe-6** Stripe Dashboard 에서 결제 + /dashboard/billing 에서 credits 충전 확인

---

## 🟩 마케팅봇 (병행 — 운영 중)

### 인스타그램 자동 발행 활성화 (Meta App 등록, 1회)

- [ ] **Meta-1** https://developers.facebook.com → 새 앱 (Type: 비즈니스) 생성
- [ ] **Meta-2** Facebook Login + Instagram Graph API 제품 추가
- [ ] **Meta-3** Valid OAuth Redirect URIs 등록:
  - `https://marketingbot.amakers.co.kr/api/auth/instagram/callback`
- [ ] **Meta-4** Vercel marketingbot 프로젝트 → env vars:
  - `META_APP_ID` (Sensitive)
  - `META_APP_SECRET` (Sensitive)
- [ ] **Meta-5** 본인 amakers 계정으로 OAuth 테스트

→ 자세한 안내: `c:\marketingbot\PHASE_50_BACKLOG.md` 의 "A. Instagram Graph API 활성화"

### 일반 사용자 공개 (App Review, 1-2주)

- [ ] **Review-1** Meta App Review 신청 (instagram_basic + instagram_content_publish 권한)
- [ ] **Review-2** Privacy Policy URL 준비
- [ ] **Review-3** 사용 흐름 screencast 제출

→ 통과 후 일반 사용자도 OAuth 가능.

---

## 🟧 인프라 (선택)

- [ ] **DNS** `designbot.amakers.co.kr`, `mockupbot.amakers.co.kr` 미리 예약 (다음 봇 시작 시점에)

---

## 🟥 SSO 통합 (마케팅봇 합류 시점)

⚠️ 운영 영향: 1회 자동 로그아웃 발생.

- [ ] **SSO-1** 마케팅봇 `auth.ts` 의 cookies 도메인 `.amakers.co.kr` 적용
- [ ] **SSO-2** 사용자에게 1회 재로그인 공지
- [ ] **SSO-3** 배포 후 pdpbot ↔ marketingbot 자동 로그인 검증

→ 자세한 안내: [`MIGRATION.md`](./MIGRATION.md) Step 7

---

## 진행 상황 표시

각 항목 완료하면 `[x]` 로 체크 후 commit (또는 채팅에 알려주시면 제가 갱신).
