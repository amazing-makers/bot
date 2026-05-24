# instabot — 인스타그램 자동화봇

마케팅봇에서 인스타그램 기능만 떼어낸 **플랫폼 전용 자동화봇**. amakers 멀티봇 플랫폼의 한 앱(`apps/instagram`)으로, 공통 인증·결제·DB 를 공유한다.

- **도메인**: instabot.amakers.co.kr (예정)
- **패키지**: `@amakers/instagram`
- **dev 포트**: 3500

## 핵심 기능 (Phase 1 — 이 스캐폴드)

- **계정 연결**: Instagram Business/Creator 계정 (Page Access Token + IG User ID) 검증 후 토큰 AES-256-GCM 암호화 저장
- **발행**: Instagram Graph API 2-step (container → publish) — 에이전트 불필요, 서버에서 직접 발행
- **게시물 관리**: 초안 / 예약 / 발행 / 실패 상태 추적, 발행 시 1 credit 차감 (통합 잔액)
- **SSO**: 마케팅봇 등 다른 봇과 같은 계정으로 자동 로그인 (쿠키 도메인 `.amakers.co.kr`)

## 기술 스택

Next.js 16 (App Router) · Mantine 9 · Prisma 7 / PostgreSQL(Supabase) · NextAuth v5 · Vercel

## 구조

```
apps/instagram/
├── prisma/schema.prisma        # 공유(User/UserCredit/CreditTransaction) + 전용(InstagramAccount/InstagramPost)
├── src/
│   ├── auth.ts, auth.config.ts # SSO NextAuth
│   ├── lib/
│   │   ├── prisma.ts           # pg.Pool max=1 (Supabase 한도 보호)
│   │   ├── crypto.ts           # AES-256-GCM (ENCRYPTION_KEY)
│   │   ├── credit.ts           # 통합 크레딧 차감
│   │   ├── instagram-account.ts# 계정 연결/검증/토큰 복호화
│   │   ├── publish.ts          # 발행 오케스트레이션
│   │   └── publishers/instagram.ts # Graph API (마케팅봇에서 이식)
│   ├── app/
│   │   ├── page.tsx            # 랜딩
│   │   ├── login/              # 로그인
│   │   ├── dashboard/          # 대시보드 · accounts · compose
│   │   ├── actions/            # 서버 액션 (accounts, posts)
│   │   └── api/{auth,health}/
│   └── components/             # AccountsManager, ComposeForm
└── scripts/seed-credits.ts
```

## 로컬 개발

```bash
# 모노레포 루트에서
npm install
npm run db:generate              # (또는 cd apps/instagram && npx prisma generate)
npm run dev:instagram            # http://localhost:3500
```

자세한 환경변수·DB 셋업은 [SETUP.md](./SETUP.md), 마일스톤은 [ROADMAP.md](./ROADMAP.md) 참조.
