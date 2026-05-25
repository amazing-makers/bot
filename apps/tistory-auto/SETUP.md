# TistoryAuto 셋업

## 1. 환경변수
```bash
cd apps/tistory-auto
cp .env.example .env.local
```
- `DATABASE_URL` / `NEXTAUTH_SECRET` — 다른 봇 `.env.local` 에서 그대로 복사 (같은 DB · SSO).
- `ENCRYPTION_KEY` — `openssl rand -hex 32` (64글자 hex). 다른 봇과 같은 값 써도 무방.

## 2. DB 마이그레이션
티스토리오토는 공유 DB 에 신규 테이블 2개(`TistoryAccount`, `TistoryPost`) + enum 을 추가한다.
```bash
cd apps/tistory-auto
npx prisma generate
npx prisma db push      # 신규 Tistory* 테이블/enum 만 추가 (공유 테이블은 동일 정의)
```
> ⚠️ 운영 DB 면 백업 후 진행. (dev 는 새 Neon 등 빈 DB 권장)

## 3. 로컬 실행
```bash
npm install
npm run dev:tistory-auto   # http://localhost:3700
```
- 다른 봇 계정으로 로그인 (SSO) → `/dashboard`
- 개발용 크레딧: `npm run seed:credits -- 1000 본인이메일`

## 4. 블로그 등록
`/dashboard/accounts` 에서 티스토리 블로그 주소(예: `myblog.tistory.com`)를 등록합니다.
> 자동 발행은 **에이전트 연동(Phase 2)** 후 활성화. 현재는 글 작성·예약(초안)까지.

## 5. (Phase 2) 에이전트
티스토리는 공개 발행 API 가 없어, 카카오 로그인 기반 Playwright 데스크톱 에이전트가 글쓰기 에디터를 자동화해 발행할 예정. (마케팅봇 에이전트 아키텍처 재사용)

## 6. Vercel 배포 (추후)
- 새 프로젝트 `tistoryauto`, Root Directory: `apps/tistory-auto`
- Build: `cd ../.. && npm run build:tistory-auto`, Install: `cd ../.. && npm install`
- 환경변수 + `NEXTAUTH_URL=https://tistoryauto.amakers.co.kr`
- Cloudflare DNS: `tistoryauto.amakers.co.kr` CNAME → `cname.vercel-dns.com`
