# Amakers Platform

멀티봇 SaaS 플랫폼 모노레포. 마케팅·상세페이지·디자인 등 여러 봇을 공통 인증·결제·DB 위에서 운영.

> 📘 명칭 컨벤션: [NAMING.md](./NAMING.md)
> 🗺 배포 계획: [DEPLOY_PLAN.md](./DEPLOY_PLAN.md)
> 🚚 마케팅봇 이전: [MIGRATION.md](./MIGRATION.md)

## 구조

```
amakers-platform/
├── apps/
│   ├── admin/        ← 어드민봇        (adminbot.amakers.co.kr) ✅ 운영
│   ├── marketing/    ← 마케팅봇        (marketingbot.amakers.co.kr) — c:\marketingbot 에서 이전 예정
│   ├── pdp/          ← 상세페이지봇    (pdpbot.amakers.co.kr) 🆕 scaffold 완료
│   ├── design/       ← 디자인봇        (designbot.amakers.co.kr) 📝 README only
│   └── mockup/       ← 모형봇          (mockupbot.amakers.co.kr) 📝 미시작
└── packages/
    ├── db/           ← 공통 Prisma 스키마 + 클라이언트 (@amakers/db) — placeholder, 추후 통합
    ├── auth/         ← 공통 NextAuth 설정 (@amakers/auth)
    ├── ui/           ← 공통 Mantine 컴포넌트 (@amakers/ui)
    ├── billing/      ← Stripe 결제·credit 공통 로직 (@amakers/billing)
    └── types/        ← 공통 타입 (@amakers/types)
```

## 봇 list

| 봇 | 도메인 | 디렉토리 | 상태 |
|---|---|---|---|
| 어드민봇 | adminbot.amakers.co.kr | apps/admin | ✅ 운영 |
| 마케팅봇 | marketingbot.amakers.co.kr | `c:\marketingbot` (별도 레포, 이전 예정) | ✅ 운영 |
| 상세페이지봇 (pdp) | pdpbot.amakers.co.kr | apps/pdp | 🆕 scaffold 완료 |
| 디자인봇 | designbot.amakers.co.kr | apps/design | 📝 README only |
| 모형봇 | mockupbot.amakers.co.kr | apps/mockup | 📝 미시작 |

## 통합 사용자 경험

- **SSO**: 모든 봇이 같은 NextAuth + 쿠키 도메인 `.amakers.co.kr` → 한 번 로그인 → 모든 봇 자동 로그인
- **통합 결제**: 한 번 충전 → 모든 봇에서 같은 잔액 사용 (Credit 모델, packages/billing)
- **공통 회원**: 모든 봇이 같은 Supabase DB 의 같은 `User` 테이블
- **패키지 구독**: 올인원 플랜 → 모든 봇 사용 가능

자세한 패턴: [DEPLOY_PLAN.md](./DEPLOY_PLAN.md)

## 도메인 전략

```
amakers.co.kr               — 아임웹 랜딩 (그대로 유지, 건드리지 않음)
adminbot.amakers.co.kr      — apps/admin (슈퍼관리자)
marketingbot.amakers.co.kr  — apps/marketing
designbot.amakers.co.kr     — apps/design (예정)
mockupbot.amakers.co.kr     — apps/mockup (예정)
# 리셀러 페이지는 marketingbot 내 /dashboard/reseller 라우트 사용 (별도 서브도메인 안 만듦)
```

DNS: Cloudflare 에서 각 서브도메인을 CNAME 으로 `cname.vercel-dns.com` 매핑. ⚠️ 루트 `amakers.co.kr` 은 아임웹이 사용 중이라 건드리지 말 것. 자세한 단계는 [DEPLOY.md](./DEPLOY.md) 참고.

## 시작하기

```bash
npm install                     # 모든 워크스페이스 의존성 설치
npm run db:generate             # Prisma 클라이언트 생성
npm run dev:admin               # admin 앱 개발 서버
npm run dev:marketing           # marketing 앱 개발 서버
```

## 마이그레이션 진행 상황

| 항목 | 상태 |
|---|---|
| 모노레포 스켈레톤 | ✅ |
| packages/db 스키마 통합 | 🟡 placeholder — 봇별 자체 schema 사용 중 (추후 통합) |
| apps/admin 골격 | ✅ 운영 |
| apps/pdp scaffold (Phase 1.1) | ✅ 2026-05-10 |
| apps/marketing 이전 (c:\marketingbot → apps/marketing) | 📅 예정 — [MIGRATION.md](./MIGRATION.md) |
| apps/design | 📝 README only |
| 리셀러 모델 | ✅ 마케팅봇 안에 운영 |
| SSO 쿠키 도메인 통합 | 🟡 pdp 부터 적용. 마케팅봇은 이전 시 |
| Credit 통합 결제 | 🟡 pdp 에서 schema 정의. Stripe 연동은 추후 |

## 환경 변수

루트 `.env.local` 또는 각 앱 `.env.local`에 다음 키 설정:

```env
# 공통
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Admin
ADMIN_EMAILS=help@amakers.co.kr  # 슈퍼관리자 이메일 화이트리스트

# AI
GOOGLE_AI_API_KEY=...
GROQ_API_KEY=...
ANTHROPIC_API_KEY=...

# R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_URL=...
```
