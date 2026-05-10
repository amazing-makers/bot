# apps/marketing — 마케팅봇

**도메인:** marketingbot.amakers.co.kr (✅ 운영 중)
**현재 위치:** `c:\marketingbot` (별도 레포 — `amazing-makers/marketingbot`)
**향후 위치:** `c:\amakers-platform\apps\marketing` (이전 예정)

> 📘 명칭 컨벤션: [../../NAMING.md](../../NAMING.md)
> 🚚 이전 절차: [../../MIGRATION.md](../../MIGRATION.md)

## 핵심 기능 (운영 중)

- AI 캡션·이미지 생성 (Claude·Gemini·Groq·Ollama·DeepL 통합)
- 22개 채널 발행 (Telegram·Discord·WordPress·LinkedIn·X·YouTube · Instagram·Naver Blog·Cafe·Threads·Facebook 등)
- 캠페인 자동 시리즈 (한 번 설정 → N주 자동 발행)
- 황금 시간대 자동 추천
- 다국가 자동 번역 (12 region × 14 language)
- Workspace 다중 브랜드
- Reseller / partner 추천 트래킹
- 발행 결과 알림 + 친절 에러 메시지
- 인스타 즉시 인증 + 채널 카드 클릭 → 본인 페이지 (Phase 50)
- 인스타 Business Graph API 자동 발행 (운영자 OAuth setup 완료 후)

## 이전 후 변경점

- `next-auth` 설정 → `@amakers/auth` 헬퍼 사용
- `prisma` 클라이언트 → `@amakers/db` 에서 import
- Stripe → `@amakers/billing` 사용
- 공통 Mantine 컴포넌트 → `@amakers/ui`
- SSO 쿠키 도메인 `.amakers.co.kr` 활성화 (모든 봇과 한 번 로그인)
- 발행 시 `spendCredits` 호출 → 통합 Credit 결제 합류

## 이전 일정

마케팅봇은 운영 중이라 신중히. [../../MIGRATION.md](../../MIGRATION.md) 의 10 step 절차 따라.

권장 시점:
- pdpbot 운영 안정화 (Phase 1.2 핵심 기능 완성) 후
- maintenance 30분 다운타임 가능한 시간대
- 사용자 공지 + DB 백업 후
