# TistoryAuto — 티스토리 자동화봇

마케팅봇에서 티스토리를 떼어낸 **플랫폼 전용 자동화 프로그램**. amakers 멀티봇 플랫폼의 한 앱(`apps/tistory-auto`)으로 공통 인증·결제·DB 를 공유한다.

- **도메인**: tistoryauto.amakers.co.kr (예정)
- **패키지**: `@amakers/tistory-auto`
- **dev 포트**: 3700

## ⚠️ 발행 방식 — 에이전트 (Phase 2)
티스토리는 **공개 발행 API 가 사실상 막혀 있어**, 인스타오토/블로그오토처럼 HTTP 로 바로 발행할 수 없습니다. 자동 발행은 **카카오 로그인 기반 데스크톱 에이전트(Playwright)** 가 담당할 예정(Phase 2)입니다.

**Phase 1(현재)**: 블로그 등록 + 글 작성·예약(초안) 관리 + SSO + 통합 크레딧 골격.
**Phase 2**: 에이전트 연동 → 실제 발행.

## 핵심 기능 (Phase 1)
- **블로그 등록**: 티스토리 블로그 주소 등록 (예: myblog.tistory.com)
- **글 관리**: 제목·본문·대표이미지로 초안/예약 작성, 상태 추적
- **SSO**: 마케팅봇 등 다른 봇과 같은 계정으로 자동 로그인 (쿠키 도메인 `.amakers.co.kr`)
- **발행 버튼**: 현재는 "에이전트 연동(Phase 2) 필요" 안내 (글은 초안으로 보존)

## 기술 스택
Next.js 16 · Mantine 9 · Prisma 7 / PostgreSQL · NextAuth v5 · Vercel

## 구조
```
apps/tistory-auto/
├── prisma/schema.prisma            # 공유(User/UserCredit/CreditTransaction) + 전용(TistoryAccount/TistoryPost)
├── src/
│   ├── auth.ts, auth.config.ts     # SSO NextAuth
│   ├── lib/
│   │   ├── prisma.ts · crypto.ts · credit.ts(bot=tistoryauto)
│   │   ├── tistory-account.ts      # 블로그 등록/조회
│   │   ├── publish.ts              # 발행 오케스트레이션 (현재 에이전트 Phase2 안내)
│   │   └── publishers/tistory.ts   # 발행 스텁 (Phase2)
│   ├── app/                        # 랜딩·로그인·대시보드·actions·api
│   └── components/                 # AccountsManager, ComposeForm
└── scripts/seed-credits.ts
```

## 로컬 개발
```bash
npm install
npm run dev:tistory-auto           # http://localhost:3700
```
환경변수·DB 셋업은 [SETUP.md](./SETUP.md), 마일스톤은 [ROADMAP.md](./ROADMAP.md) 참조.
