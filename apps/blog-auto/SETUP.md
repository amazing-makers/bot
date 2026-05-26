# naverblogauto 셋업

## 1. 환경변수

```bash
cd apps/blog-auto
cp .env.example .env.local
```

- `DATABASE_URL` / `NEXTAUTH_SECRET` — 마케팅봇 `.env.local` 에서 그대로 복사 (같은 DB · SSO).
- `ENCRYPTION_KEY` — `openssl rand -hex 32` (64글자 hex). 인스타봇과 같은 값을 써도 무방.

## 2. DB 마이그레이션 (⚠️ 공유 운영 DB)

블로그봇은 공유 Supabase 에 신규 테이블 2개(`BlogAccount`, `BlogPost`) + enum 을 추가한다. **백업 후 진행.**

```bash
# Supabase 대시보드 → Database → Backups → Manual Backup 먼저!

cd apps/blog-auto
npx prisma generate
npx prisma db push      # 신규 Blog* 테이블/enum 만 추가 (공유 테이블은 동일 정의라 변경 X)
```

## 3. 로컬 실행

```bash
npm install
npm run dev:blog-auto        # http://localhost:3600
```

- 마케팅봇 계정으로 로그인 (SSO) → `/dashboard`
- 개발용 크레딧: `cd apps/blog-auto && npm run seed:credits -- 1000 본인이메일`

## 4. WordPress 연결

`/dashboard/accounts` 에서:
1. WordPress 관리자 → 사용자 → 프로필 → "Application Passwords" → 새 비밀번호 생성 (24자)
2. 사이트 URL(`https://...`) + username + Application Password 입력 → "연결하고 검증"
   - 검증은 `GET /wp-json/wp/v2/users/me` 로 인증 확인

## 5. Vercel 배포 (추후)

- 새 프로젝트 `naverblogauto`, Root Directory: `apps/blog-auto`
- Build: `cd ../.. && npm run build:blog-auto`, Install: `cd ../.. && npm install`
- 환경변수 + `NEXTAUTH_URL=https://naverblogauto.amakers.co.kr`
- Cloudflare DNS: `naverblogauto.amakers.co.kr` CNAME → `cname.vercel-dns.com`
