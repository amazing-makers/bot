# 오토봇 배포 가이드 (insta / blog / tistory → amakers.co.kr)

인스타오토·블로그오토·티스토리오토를 Vercel + Cloudflare DNS 로 `*.amakers.co.kr` 에 배포.
운영 중인 marketingbot/adminbot 과 동일 패턴 ([DEPLOY.md](./DEPLOY.md) 참조).

## 0. 대상

| 앱 | Root Directory | 도메인 | Vercel 프로젝트명(권장) |
|---|---|---|---|
| 인스타오토 | `apps/insta-auto` | instaauto.amakers.co.kr | instaauto |
| 블로그오토 | `apps/blog-auto` | blogauto.amakers.co.kr | blogauto |
| 티스토리오토 | `apps/tistory-auto` | tistoryauto.amakers.co.kr | tistoryauto |

> ⛔ `amakers.co.kr` / `www` (아임웹) · MX(이메일)는 **건드리지 말 것.**

## 1. 공유 DB 준비 (각 앱 1회)
공유 DB 에 앱별 테이블 추가 — `db push` 금지, **추가 전용 SQL** 사용:
```bash
# 예: insta-auto (운영 DATABASE_URL 로)
cd apps/insta-auto
DATABASE_URL="<운영 DB direct URL>" npx prisma db execute --file ./prisma/manual/001_add_instagram_tables.sql
DATABASE_URL="<운영 DB direct URL>" npx prisma db execute --file ./prisma/manual/002_add_userapikey.sql
# blog-auto: prisma/manual/001_add_blog_tables.sql
# tistory-auto: prisma 스키마 db push 는 빈 DB 에서만 — 공유 DB 면 동일하게 manual SQL 권장
```

## 2. Cloudflare DNS (각 도메인)
Cloudflare → amakers.co.kr → DNS → Add record:
| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `instaauto` | `cname.vercel-dns.com` | **DNS only (회색 구름)** |
| CNAME | `blogauto` | `cname.vercel-dns.com` | DNS only |
| CNAME | `tistoryauto` | `cname.vercel-dns.com` | DNS only |

## 3. Vercel 프로젝트 (앱마다 반복)
1. Vercel → **Add New → Project** → Import **`amazing-makers/bot`**
2. **Root Directory**: `apps/insta-auto` (각 앱 경로)
3. **Build Command**: `cd ../.. && npm install && cd apps/insta-auto && npx prisma generate && next build`
4. **Install Command**: 비워두기
5. **Output Directory**: `.next` / **Framework**: Next.js
6. **Environment Variables** (아래 4-1) 입력 → **Deploy**
7. **Settings → Domains → Add** → `instaauto.amakers.co.kr` (1~2분 후 SSL 자동)

### 4-1. 환경변수 (모든 앱 공통)
```
DATABASE_URL      = <공유 Supabase/Neon Session pooler URL>   # 모든 봇 동일
NEXTAUTH_SECRET   = <openssl rand -base64 32>                  # 봇별 달라도 됨(단독 로그인). SSO 통합하려면 동일
NEXTAUTH_URL      = https://instaauto.amakers.co.kr            # 각 앱 자기 도메인
ENCRYPTION_KEY    = <openssl rand -hex 32>                     # 토큰/키 암호화. ⚠️ 한 번 정하면 변경 금지(기존 암호문 복호화 불가)
CRON_SECRET       = <openssl rand -hex 16>                     # 예약 자동발행 cron 보호 (insta/blog)
```
- insta/blog 는 `vercel.json` 에 cron(매 5분)이 있어 CRON_SECRET 설정 시 Vercel 이 자동 호출.
- 인스타 Facebook OAuth 쓰면(아래 6): `META_APP_ID`, `META_APP_SECRET` 추가.
- R2 이미지 업로드 쓰면(아래 5): `R2_*` 5개 추가.

---

## 5. Cloudflare R2 (이미지 업로드 — 선택)
> 현재는 AI 이미지(Pollinations 공개 URL)·외부 public URL 로 동작. R2 는 "내 이미지 업로드"용.

1. Cloudflare 대시보드 → **R2** → (최초) 결제수단 등록(무료 10GB)
2. **Create bucket** → 이름 예: `amakers-media`
3. 좌측 **R2 → Manage R2 API Tokens → Create API Token**
   - Permissions: **Object Read & Write**
   - 생성되면 **Access Key ID** / **Secret Access Key** 표시 → 복사(시크릿은 1회만 보임)
4. **Endpoint**: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (ACCOUNT_ID 는 R2 개요에 표시)
5. **공개 URL**: 버킷 → Settings → **Public access** 활성(r2.dev) 또는 Custom Domain(예: cdn.amakers.co.kr)
6. **Vercel 환경변수에 입력**:
```
R2_ENDPOINT           = https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID      = <Access Key ID>
R2_SECRET_ACCESS_KEY  = <Secret Access Key>
R2_BUCKET             = amakers-media
R2_PUBLIC_URL         = https://<bucket>.r2.dev   (또는 https://cdn.amakers.co.kr)
```
> 입력 후 알려주시면 R2 업로드 코드(lib/storage/r2 + 업로드 UI)를 붙입니다. (마케팅봇 lib/storage/r2.ts 참고)

## 6. Facebook(Meta) — 인스타 1-click OAuth (선택)
> 현재는 Page Access Token 수동 입력으로 동작. OAuth 는 토큰 setup 자동화(만료/오타 실패 감소)용.

1. [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App** → 유형 **Business**
2. 앱 대시보드 → **Add Product**: **Facebook Login** + **Instagram Graph API** 추가
3. **App settings → Basic**: **App ID** / **App Secret** 복사
4. **Facebook Login → Settings → Valid OAuth Redirect URIs** 에 추가:
   `https://instaauto.amakers.co.kr/api/auth/callback/facebook`  (구현 시 경로 확정)
5. 권한(App Review): `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement` (개발 모드는 본인 계정 테스트 가능, 공개 배포는 앱 검수 필요)
6. **Vercel 환경변수에 입력**:
```
META_APP_ID      = <App ID>
META_APP_SECRET  = <App Secret>
```
> 입력 후 알려주시면 OAuth 플로우(연결 버튼 → 페이지/IG 계정 선택 → long-lived 토큰 자동 저장)를 붙입니다. (마케팅봇 instagram-oauth 참고)

---

## 7. 배포 후 확인
- `https://instaauto.amakers.co.kr/api/health` → `{"ok":true,"bot":"instaauto"}`
- 로그인(다른 봇과 같은 DB의 계정) → 대시보드 → 계정 연결 → 발행/예약
- 예약 자동발행: Vercel → 프로젝트 → **Cron Jobs** 탭에서 dispatch-scheduled 5분마다 실행 확인

## 8. 트러블슈팅
| 증상 | 해결 |
|---|---|
| SSL 발급 안 됨 | DNS 미전파/프록시 켜짐 → `nslookup instaauto.amakers.co.kr` 가 cname.vercel-dns.com 응답하는지, Cloudflare **DNS only(회색)** 확인 |
| `prisma: command not found` | Build Command 의 `cd ../.. && npm install` 누락 확인 |
| 로그인 실패 | DATABASE_URL 이 공유 DB 가리키는지 + 계정 존재 여부 |
| cron 미동작 | CRON_SECRET env 설정 + Vercel Cron Jobs 탭 확인 |
