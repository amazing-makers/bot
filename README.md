# Amakers Platform

멀티봇 SaaS 플랫폼 모노레포. 마케팅·디자인·목업 등 여러 봇을 공통 인증·결제·DB 위에서 운영.

## 구조

```
amakers-platform/
├── apps/
│   ├── admin/        ← 슈퍼관리자 대시보드 (adminbot.amakers.co.kr)
│   ├── marketing/    ← 마케팅봇 (marketingbot.amakers.co.kr) — c:\marketingbot 에서 이전 예정
│   └── design/       ← 디자인봇 (designbot.amakers.co.kr) — 추후
└── packages/
    ├── db/           ← 공통 Prisma 스키마 + 클라이언트 (@amakers/db)
    ├── auth/         ← 공통 NextAuth 설정 (@amakers/auth)
    ├── ui/           ← 공통 Mantine 컴포넌트 (@amakers/ui)
    ├── billing/      ← Stripe 결제·구독 공통 로직 (@amakers/billing)
    └── types/        ← 공통 타입 (@amakers/types)
```

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
| packages/db 스키마 통합 | ✅ |
| apps/admin 골격 | 진행 중 |
| apps/marketing 이전 (c:\marketingbot → apps/marketing) | 미정 — MIGRATION.md 참고 |
| apps/design | 플레이스홀더 |
| 리셀러 모델 | 진행 중 |

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
