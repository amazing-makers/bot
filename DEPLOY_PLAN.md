# amakers 멀티봇 플랫폼 배포 계획

**작성일:** 2026-05-10

> 마케팅봇 + 어드민봇 + pdpbot + designbot + mockupbot 등 다수의 봇이 한 사용자/결제/회원 시스템을 공유하면서 각자 별도 도메인으로 동작하는 통합 SaaS 운영 모델.

---

## 🌐 도메인 / 인프라 구성

```
amakers.co.kr (아임웹)                        ← 메인 회사 사이트, ⚠️ 절대 건드리지 X
│
├─ marketingbot.amakers.co.kr  ✅ 운영 중       Vercel: marketingbot (별도 레포 c:\marketingbot)
├─ adminbot.amakers.co.kr      ✅ 운영 중       Vercel: bot-admin (apps/admin)
├─ pdpbot.amakers.co.kr        🆕 신규           Vercel: bot-pdp (apps/pdp)
├─ designbot.amakers.co.kr     📝 미래           apps/design
└─ mockupbot.amakers.co.kr     📝 미래           apps/mockup

공통 인프라:
- Supabase PostgreSQL (1개) — 모든 봇 같은 DB, 같은 User 테이블
- Cloudflare DNS — 각 subdomain CNAME → cname.vercel-dns.com (DNS only, 회색 구름)
- Vercel — 봇별 별도 프로젝트 (Root Directory 분리)
```

---

## 🔐 SSO (Single Sign-On) — 쿠키 도메인 공유

모든 봇이 `.amakers.co.kr` 도메인 쿠키 사용 → 한 봇에서 로그인 시 모든 봇 자동 로그인.

**필수 조건**:
- 모든 봇이 같은 `NEXTAUTH_SECRET` 사용
- 모든 봇이 같은 User 테이블의 같은 사용자 인증
- 쿠키 이름 통일 (`__Secure-authjs.session-token`)

**구현 위치 (각 봇의 auth.config.ts)**:
```ts
cookies: process.env.NEXTAUTH_URL?.includes('amakers.co.kr')
  ? {
      sessionToken: {
        name: '__Secure-authjs.session-token',
        options: { domain: '.amakers.co.kr', secure: true, sameSite: 'lax', httpOnly: true, path: '/' }
      }
    }
  : {}
```

⚠️ **마케팅봇은 현재 단일 도메인 쿠키** (도메인 명시 X). SSO 활성화하려면 마케팅봇 auth.ts 도 같이 업데이트 필요. 변경 시 기존 사용자 1회 재로그인 발생.

---

## 💰 Credit 기반 통합 결제

모든 봇이 한 사용자의 같은 잔액 사용 → "패키지 결제" / "일회성 충전" / "구독" 모두 같은 잔액에 들어감.

### 단가 (1 credit ≈ ₩100 추정)

| 작업 | Credits |
|---|---|
| GPT-4 Vision OCR (이미지 1장) | 5 |
| FLUX 1.1 Pro Fill 인페인팅 (1장) | 30 |
| Claude Opus 번역 (텍스트 1개) | 5 |
| FLUX/DALL-E 신규 이미지 생성 | 20 |
| 마케팅봇 클라우드 발행 (Telegram/WordPress 등) | 1 |
| 마케팅봇 에이전트 발행 (Instagram/Naver 등) | 2 |

### 결제 플랜 예시

| 플랜 | 가격 | 포함 Credits | 마진 |
|---|---|---|---|
| **무료** | ₩0 | 100 (가입 보너스, 1회) | — |
| **스타터** | ₩30,000/월 | 1,000 | ~50% |
| **프로** | ₩100,000/월 | 4,000 + 무제한 마케팅봇 발행 | ~40% |
| **올인원** | ₩300,000/월 | 15,000 + 모든 봇 무제한 | ~30% |
| **충전형** | ₩10,000~ | 단발 충전 (10,000 credits ÷ ₩10) | ~30% |

→ Stripe 구독 + Stripe one-time payment 둘 다 사용. webhook 으로 `addCredits()` 호출.

### 모델

```prisma
model UserCredit {
  userId   String @unique
  balance  Int    @default(0)
  ...
}

model CreditTransaction {
  delta        Int
  bot          String   // 'pdpbot' | 'marketingbot' | ...
  action       String   // 'OCR' | 'INPAINT' | 'PUBLISH' | 'PURCHASE' | ...
  ...
}
```

---

## 📅 단계별 진행 (각 봇)

### Phase A — pdpbot 로컬 동작 (1시간, 사용자 액션)

```powershell
cd c:\amakers-platform
npm install                               # workspace deps 자동 install
cd apps/pdp

# .env.local 만들기
cat > .env.local <<EOF
DATABASE_URL=<마케팅봇과 같은 값>
NEXTAUTH_SECRET=<마케팅봇과 같은 값>
NEXTAUTH_URL=http://localhost:3200
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...
EOF

# Prisma client 생성 (apps/pdp 의 schema 기반)
npx prisma generate
# 운영 DB 에 새 테이블 (UserCredit, CreditTransaction, Product, ScrapedImage, TextRegion, OutputImage) 추가
npx prisma migrate dev --name pdp_initial

npm run dev   # http://localhost:3200
```

### Phase B — pdpbot 운영 배포 (30분, 사용자 액션)

1. **Vercel 새 프로젝트 생성**:
   - amakers-platform 레포 import
   - Root Directory: `apps/pdp`
   - Framework: Next.js (자동)
   - Build Command: `prisma migrate deploy && prisma generate && next build`

2. **환경변수 등록** (Vercel → Settings → Environment Variables):
   - `DATABASE_URL` (sensitive)
   - `NEXTAUTH_SECRET` (sensitive, 마케팅봇과 동일)
   - `NEXTAUTH_URL` = `https://pdpbot.amakers.co.kr`
   - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `REPLICATE_API_TOKEN`
   - `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` (이미지 저장)

3. **DNS** (Cloudflare):
   - `pdpbot.amakers.co.kr` CNAME → `cname.vercel-dns.com` (DNS only, 회색 구름)
   - Vercel 프로젝트 → Domains → `pdpbot.amakers.co.kr` 추가

### Phase C — Phase 1.2 핵심 기능 (1-2일, 다음 세션)

- GPT-4 Vision OCR
- FLUX 1.1 Pro Fill 인페인팅
- Claude Opus 번역
- Sharp + 폰트 합성
- 결과 다운로드 + ZIP

### Phase D — 결제 시스템 (3-5일)

- Stripe 구독 + 일회성 충전
- 결제 페이지 (`/pricing`, `/dashboard/billing`)
- Webhook → `addCredits()` 자동 호출

### Phase E — Phase 2~4 (1-2달)

ROADMAP.md 참조.

---

## 🚧 마이그레이션 / 통합 작업 (별도 트랙)

### 1. SSO 활성화 (마케팅봇)

마케팅봇 auth.ts 의 cookies 설정에 도메인 추가:
```diff
+ cookies: { sessionToken: { options: { domain: '.amakers.co.kr', ... } } }
```

⚠️ 운영 사용자 1회 재로그인 발생. 공지 + 천천히 진행.

### 2. Schema 통합 (packages/db)

현재 마케팅봇 + adminbot + pdpbot 각자 prisma/schema.prisma 보유. 통합 시점:
- 마케팅봇 → apps/marketing 으로 이전 (MIGRATION.md)
- packages/db/prisma/schema.prisma 가 source-of-truth
- 모든 앱이 `@amakers/db` 의 prisma client import

### 3. UI 통일 (packages/ui)

각 봇의 Mantine theme + 브랜드 토큰 통일. amakers 색상 (보라 + 핑크 그라데이션).

### 4. 결제 통일 (packages/billing)

Stripe 키 + webhook 처리 + UserCredit 헬퍼 모두 packages/billing 으로 추출.
모든 봇이 `import { spendCredits } from '@amakers/billing'` 사용.

---

## 🎯 우선순위 권장

| 단계 | 시기 | 가치 |
|---|---|---|
| Phase A (pdp 로컬 동작) | 즉시 (사용자 액션) | scaffold 검증 |
| Phase B (pdp 운영 배포) | Phase A 후 | 첫 배포 baseline |
| Phase C (Phase 1.2 기능) | 다음 세션 | 핵심 가치 — 셀러 사용 가능 |
| SSO 활성화 | Phase C 동시 | 사용자 한 번 로그인 |
| Phase D (결제) | Phase C 후 | 수익화 |
| Phase E + Schema 통합 | 1-2달 후 | 장기 안정화 |
