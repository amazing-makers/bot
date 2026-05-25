# instaauto 셋업

## 1. 환경변수

```bash
cd apps/insta-auto
cp .env.example .env.local
```

- `DATABASE_URL` / `NEXTAUTH_SECRET` — 마케팅봇 `.env.local` 에서 그대로 복사 (같은 DB · SSO).
- `ENCRYPTION_KEY` — `openssl rand -hex 32` 로 새로 생성 (64글자 hex).

## 2. DB 마이그레이션 (⚠️ 공유 운영 DB)

인스타봇은 공유 Supabase 에 신규 테이블 2개(`InstagramAccount`, `InstagramPost`)와
enum 3개를 추가한다. **운영 DB 이므로 백업 후 진행.**

```bash
# Supabase 대시보드 → Database → Backups → Manual Backup 먼저!

cd apps/insta-auto
npx prisma generate            # 클라이언트 생성 (코드 타입체크용 — 항상 안전)
npx prisma db push             # 신규 테이블/enum 만 추가 (기존 공유 테이블은 동일 정의라 변경 X)
```

> `db push` 는 schema 와 DB 차이만 반영. User/UserCredit/CreditTransaction 은 다른 봇과
> 동일하게 정의돼 있어 변경이 생기지 않아야 정상 — diff 에 신규 Instagram* 만 보이는지 확인할 것.

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
