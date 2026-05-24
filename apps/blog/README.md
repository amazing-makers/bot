# blogbot — 블로그 자동화봇

마케팅봇에서 블로그 발행 기능을 떼어낸 **플랫폼 전용 자동화봇**. amakers 멀티봇 플랫폼의 한 앱(`apps/blog`)으로 공통 인증·결제·DB 를 공유한다.

- **도메인**: blogbot.amakers.co.kr (예정)
- **패키지**: `@amakers/blog`
- **dev 포트**: 3600

## 핵심 기능 (Phase 1 — 이 스캐폴드)

- **블로그 연결**: WordPress 사이트(REST API + Application Password) 검증 후 자격증명 AES-256-GCM 암호화 저장
- **발행**: WordPress REST API — 이미지 업로드(미디어) + 게시글 작성, 에이전트 불필요
- **게시글 관리**: 초안 / 예약 / 발행 / 실패 상태 추적, 발행 시 1 credit 차감 (통합 잔액)
- **SSO**: 마케팅봇 등 다른 봇과 같은 계정으로 자동 로그인 (쿠키 도메인 `.amakers.co.kr`)

> ℹ️ **네이버블로그**는 공개 발행 API 가 없어 데스크톱 에이전트(브라우저 자동화)가 필요 → Phase 2 예정. 티스토리는 별도 봇(`apps/tistory`).

## 기술 스택

Next.js 16 · Mantine 9 · Prisma 7 / PostgreSQL(Supabase) · NextAuth v5 · Vercel

## 구조

```
apps/blog/
├── prisma/schema.prisma         # 공유(User/UserCredit/CreditTransaction) + 전용(BlogAccount/BlogPost)
├── src/
│   ├── auth.ts, auth.config.ts  # SSO NextAuth
│   ├── lib/
│   │   ├── prisma.ts            # pg.Pool max=1
│   │   ├── crypto.ts            # AES-256-GCM (ENCRYPTION_KEY)
│   │   ├── credit.ts            # 통합 크레딧 (bot=blogbot)
│   │   ├── blog-account.ts      # 계정 연결/검증/복호화
│   │   ├── publish.ts           # 발행 오케스트레이션
│   │   └── publishers/wordpress.ts  # WordPress REST (마케팅봇에서 이식)
│   ├── app/                     # 랜딩·로그인·대시보드(accounts/compose)·actions·api
│   └── components/              # AccountsManager, ComposeForm
└── scripts/seed-credits.ts
```

## 로컬 개발

```bash
npm install
npm run dev:blog                 # http://localhost:3600
```

환경변수·DB 셋업은 [SETUP.md](./SETUP.md), 마일스톤은 [ROADMAP.md](./ROADMAP.md) 참조.
