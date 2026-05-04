# apps/marketing — 마케팅봇

**현재 위치:** `c:\marketingbot` (별도 리포)
**향후 위치:** `c:\amakers-platform\apps\marketing` (이전 예정)

이전 시점은 `MIGRATION.md` 참고.

## 이전 후 차이점

- `next-auth` 설정은 `@amakers/auth` 의 헬퍼 사용
- `prisma` 클라이언트는 `@amakers/db` 에서 import
- Stripe 로직은 `@amakers/billing` 사용
- 공통 Mantine 컴포넌트는 `@amakers/ui` 사용
- Reseller / referral 트래킹: `lib/referral.ts` 추가, 회원가입 폼에 `?ref=CODE` 처리
