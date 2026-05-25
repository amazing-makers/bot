# instaauto 셋업

## 1. 환경변수

```bash
cd apps/insta-auto
cp .env.example .env.local
```

- `DATABASE_URL` / `NEXTAUTH_SECRET` — 마케팅봇 `.env.local` 에서 그대로 복사 (같은 DB · SSO).
- `ENCRYPTION_KEY` — `openssl rand -hex 32` 로 새로 생성 (64글자 hex).

## 2. DB 마이그레이션 (⚠️ 공유 DB — `db push` 쓰지 말 것)

인스타오토는 공유 DB 에 `InstagramAccount`/`InstagramPost` + enum 3개를 추가한다.

> 🚫 **`prisma db push` 금지 (공유 DB).** db push 는 "이 앱 스키마 = DB 전체"로 간주해
> **다른 앱(블로그·티스토리 등)의 테이블을 DROP 하려 한다** (실제로 그런 경고가 뜸).
> 공유 DB 에는 항상 **추가 전용(idempotent) SQL** 을 `db execute` 로 적용한다.

```bash
cd apps/insta-auto
npx prisma generate            # 클라이언트 생성 (코드 타입체크용 — 항상 안전)

# 추가 전용 SQL 적용 (CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS — 다른 테이블 미변경)
npx prisma db execute --file ./prisma/manual/001_add_instagram_tables.sql
#   (datasource 는 prisma.config.ts → .env.local 의 DATABASE_URL 사용. 운영 DB 면 백업 후.)
```

> 스키마에 컬럼/모델을 추가하면 `prisma/manual/001_add_instagram_tables.sql` 에도
> `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` 로 반영할 것.

## 3. 로컬 실행

```bash
# 모노레포 루트
npm install
npm run dev:insta-auto          # http://localhost:3500
```

- 마케팅봇 계정으로 로그인 (SSO) → `/dashboard`
- 개발용 크레딧 충전: `cd apps/insta-auto && npm run seed:credits -- 1000 본인이메일`

## 4. 인스타 계정 연결 (Graph API)

`/dashboard/accounts` 에서:
1. developers.facebook.com → 앱(Business) 생성 → Instagram Graph API + Facebook Login 추가
2. Graph API Explorer / Access Token Tool 에서 **Page Access Token** 발급
   (scope: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`)
3. `/me/accounts` → page id, `/{page-id}?fields=instagram_business_account` → **IG User ID**
4. (권장) `/oauth/access_token?grant_type=fb_exchange_token` 으로 long-lived(60일) 교환
5. 토큰 + IG User ID 입력 → "연결하고 검증"

## 5. Vercel 배포 (추후)

- 새 프로젝트 `instaauto`, Root Directory: `apps/insta-auto`
- Build: `cd ../.. && npm run build:insta-auto`
- Install: `cd ../.. && npm install`
- 환경변수: 위 + `NEXTAUTH_URL=https://instaauto.amakers.co.kr`
- Cloudflare DNS: `instaauto.amakers.co.kr` CNAME → `cname.vercel-dns.com`
