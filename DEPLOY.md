# 배포·온보딩 가이드

> (1) 다른 컴퓨터에서 작업 이어가기, (2) Supabase DB 마이그레이션, (3) Cloudflare DNS + Vercel 배포, (4) Imweb 루트 도메인 보호 — 단계별 안내.

## 🌐 도메인 정책 (요약)

```
amakers.co.kr               — 아임웹 랜딩 (그대로 유지) ⛔ 건드리지 말 것
www.amakers.co.kr           — 아임웹 (그대로)
adminbot.amakers.co.kr      — apps/admin (슈퍼관리자)
marketingbot.amakers.co.kr  — apps/marketing
designbot.amakers.co.kr     — apps/design (예정)
mockupbot.amakers.co.kr     — apps/mockup (예정)
```

**원칙**: 모든 amakers 자체 앱은 `<name>bot.amakers.co.kr` 패턴. 루트와 www 는 아임웹 마케팅 사이트가 사용 중.

---

## 📦 Phase A. GitHub Push ✅ (완료)

| 프로젝트 | 위치 | 상태 |
|---|---|---|
| marketingbot | https://github.com/amazing-makers/marketingbot | ✅ push 완료 (P5-P13) |
| amakers-platform | https://github.com/amazing-makers/bot | ✅ push 완료 |

---

## 💻 Phase B. 다른 컴퓨터에서 이어 작업

### B-1. clone + 환경 셋업

```bash
# marketingbot
git clone https://github.com/amazing-makers/marketingbot.git
cd marketingbot
npm install
cp .env.example .env.local       # 기존 키들 채우기
npx prisma generate
npm run dev                      # http://localhost:3000

# amakers-platform (모노레포)
git clone https://github.com/amazing-makers/bot.git amakers-platform
cd amakers-platform
npm install                      # 모든 워크스페이스 (~1분)
cd apps/admin
cp .env.example .env.local       # DATABASE_URL 등 채우기
npx prisma generate
cd ../..
npm run dev:admin                # http://localhost:3100
```

### B-2. 환경변수 동기화 팁

⚠️ **`.env.local` 은 절대 git 에 commit 금지** (`.gitignore` 에 포함됨).

추천 방법:
- **Vercel CLI**: `vercel env pull .env.local` (Vercel 등록 후 가장 깔끔)
- **1Password / Bitwarden** 에 모든 키 저장 → 다른 PC 에서 복사

---

## 🗄 Phase C. 운영 Supabase DB 마이그레이션

### C-1. 백업 (필수, 2분 소요)

1. https://supabase.com/dashboard → 프로젝트 선택
2. **Database → Backups → Take a snapshot**
3. "Backup completed" 확인

> Free 플랜이면 `Database → SQL Editor` 에서 `SELECT * FROM "User"` 실행 → CSV 다운로드.

### C-2. 마이그레이션 적용

```bash
cd /c/marketingbot
npx prisma migrate deploy
```

### C-3. 검증

```bash
npx prisma studio   # http://localhost:5555
# Reseller / ReferralCode / ReferralCommission 테이블 보이는지 확인
```

### C-4. 롤백 (만일의 경우)

```sql
DROP TABLE IF EXISTS "ReferralCommission" CASCADE;
DROP TABLE IF EXISTS "ReferralCode" CASCADE;
DROP TABLE IF EXISTS "Reseller" CASCADE;
ALTER TABLE "User" DROP COLUMN IF EXISTS "referredByCodeId";
```

---

## 🌐 Phase D. Cloudflare DNS 설정

### D-1. ⚠️ Cloudflare 프록시 설정 (중요)

Cloudflare 의 **주황색 구름 (Proxied)** 은 Vercel 과 충돌 가능성 있음. 이유:
- Vercel 이 자체 SSL 인증서 발급 (Let's Encrypt) 필요
- Cloudflare 프록시는 자체 SSL 처리 → "too many redirects" 에러 발생 가능

**권장 설정**: 각 봇 서브도메인은 **DNS only (회색 구름)** 으로.

### D-2. Cloudflare 대시보드에서 DNS 레코드 추가

https://dash.cloudflare.com → amakers.co.kr 선택 → **DNS → Records → Add record**

각 봇마다 추가 (Vercel 가이드 따라 정확히):

| Type | Name | Content | Proxy status | TTL |
|------|------|---------|--------------|-----|
| `CNAME` | `marketingbot` | `cname.vercel-dns.com` | **DNS only** (회색 구름) | Auto |
| `CNAME` | `adminbot` | `cname.vercel-dns.com` | **DNS only** (회색 구름) | Auto |
| `CNAME` | `designbot` | `cname.vercel-dns.com` | **DNS only** | Auto (나중에 추가) |
| `CNAME` | `mockupbot` | `cname.vercel-dns.com` | **DNS only** | Auto (나중에 추가) |

### D-3. ⛔ 건드리면 안 되는 것

```
❌ amakers.co.kr 의 A 레코드 / CNAME (아임웹 사용 중)
❌ www.amakers.co.kr (아임웹 사용 중)
❌ MX 레코드 (이메일 — help@amakers.co.kr)
❌ TXT (SPF/DKIM/DMARC — 이메일 도메인 인증)
```

**기존 레코드는 모두 그대로 두고**, 위 4개 봇 서브도메인만 신규 추가.

### D-4. 추가 후 확인

```bash
# DNS 전파 (보통 1-5분, 최대 24시간)
nslookup marketingbot.amakers.co.kr 8.8.8.8
nslookup adminbot.amakers.co.kr 8.8.8.8
# → cname.vercel-dns.com 으로 응답하면 OK
```

---

## 🚀 Phase E. Vercel 배포

### E-1. Vercel 계정 준비

https://vercel.com/signup → GitHub `amazing-makers` 계정으로 로그인.

### E-2. marketingbot 프로젝트 (이미 있다면 도메인만 추가)

#### 신규 등록 시:
1. Vercel 대시보드 → **Add New → Project**
2. **Import** → `amazing-makers/marketingbot` 선택
3. **Framework Preset**: Next.js (자동 감지)
4. **Build Command**: 기본값 (`prisma generate && next build` 가 package.json 에 있음)
5. **Environment Variables**: 아래 항목 모두 입력
6. **Deploy**

#### Environment Variables (Settings → Environment Variables):
```
DATABASE_URL                postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres
NEXTAUTH_SECRET             (openssl rand -base64 32 결과)
NEXTAUTH_URL                https://marketingbot.amakers.co.kr
GOOGLE_AI_API_KEY           ...
GROQ_API_KEY                ...
ANTHROPIC_API_KEY           ...
OPENAI_API_KEY              ...
DEEPL_API_KEY               ...
R2_ACCOUNT_ID               ...
R2_ACCESS_KEY_ID            ...
R2_SECRET_ACCESS_KEY        ...
R2_BUCKET                   ...
R2_PUBLIC_URL               https://...r2.dev
STRIPE_SECRET_KEY           sk_live_...
STRIPE_WEBHOOK_SECRET       whsec_...
STRIPE_PRICE_STARTER        price_...
STRIPE_PRICE_PRO            price_...
STRIPE_PRICE_BUSINESS       price_...
CRON_SECRET                 (랜덤 32자, /api/cron/* 보호용)
RESEND_API_KEY              ... (이메일 발송)
```

#### 도메인 연결:
1. **Settings → Domains** → `Add` → `marketingbot.amakers.co.kr`
2. Vercel 이 "Configure DNS" 안내 표시 → 무시 (이미 D-2 에서 등록함)
3. 1-2분 후 SSL 자동 발급, 초록색 체크 확인

### E-3. admin 프로젝트 (신규)

1. Vercel 대시보드 → **Add New → Project**
2. **Import** → `amazing-makers/bot` 선택
3. ⚠️ **Root Directory**: `apps/admin` 으로 변경 (모노레포라서)
4. **Build Command**: `cd ../.. && npm install && cd apps/admin && npx prisma generate && next build`
5. **Install Command**: 비워두기
6. **Output Directory**: `.next`
7. **Framework Preset**: Next.js
8. **Environment Variables**:
   ```
   DATABASE_URL              (marketingbot 과 동일한 Supabase URL)
   NEXTAUTH_SECRET           (openssl rand -base64 32 — marketingbot 과 다른 값 OK)
   NEXTAUTH_URL              https://adminbot.amakers.co.kr
   ADMIN_EMAILS              help@amakers.co.kr
   ADMIN_PASSWORD            (강력한 비밀번호 — 임시)
   ```
9. **Deploy**
10. **Settings → Domains** → `adminbot.amakers.co.kr` 추가

### E-4. cron 등록 (marketingbot)

`marketingbot/vercel.json` 에 다음 내용 추가 (이미 있으면 schedules 배열에 append):

```json
{
  "crons": [
    { "path": "/api/cron/dispatch-series",        "schedule": "*/5 * * * *" },
    { "path": "/api/cron/calculate-commissions",  "schedule": "0 3 1 * *" }
  ]
}
```

`CRON_SECRET` 환경변수 설정 필수 (route.ts 에서 검증).

### E-5. 배포 검증

```
✅ https://marketingbot.amakers.co.kr           → 마케팅봇 랜딩
✅ https://marketingbot.amakers.co.kr/dashboard → 로그인 후 대시보드
✅ https://marketingbot.amakers.co.kr/dashboard/reseller → 리셀러 가입
✅ https://marketingbot.amakers.co.kr/register?ref=TEST  → 추천 배지
✅ https://adminbot.amakers.co.kr               → 관리자 로그인
✅ https://adminbot.amakers.co.kr/users         → 사용자 목록
✅ https://amakers.co.kr                         → 아임웹 랜딩 (변경 없음)
```

---

## 🔄 Phase F. 일상 워크플로

```bash
# 다른 컴퓨터에서
git pull origin main
npm install                          # package.json 변경 있을 때만

# 작업
npm run dev                          # marketingbot
npm run dev:admin                    # admin (포트 3100)

# 변경사항 push
git add .
git commit -m "feat(xx): 변경 내용"
git push origin main
# → Vercel 이 자동으로 production 배포 (main 브랜치 push 시)
```

### Preview 배포 (안전한 실험)

```bash
git checkout -b feature/new-bot
# 변경 작업
git push origin feature/new-bot
# → Vercel preview URL 자동 생성 (feature 브랜치는 production 영향 X)
```

---

## 📋 체크리스트

### 1차 (지금)
- [x] marketingbot push ✅
- [x] amakers-platform push (github.com/amazing-makers/bot) ✅
- [ ] Supabase 백업 → migrate deploy
- [ ] Reseller 테이블 생성 확인 (Prisma Studio)

### 2차 (Vercel)
- [ ] Cloudflare DNS — marketingbot, adminbot 2개 CNAME 추가 (DNS only)
- [ ] Vercel — marketingbot 프로젝트 + 환경변수 + 도메인
- [ ] Vercel — admin 프로젝트 (Root: apps/admin) + 환경변수 + 도메인
- [ ] vercel.json cron 추가 + CRON_SECRET 설정
- [ ] amakers.co.kr 아임웹 영향 없음 확인 (https://amakers.co.kr 접속)

### 3차 (검증)
- [ ] 다른 컴퓨터에서 clone + npm install + dev 동작
- [ ] 운영 marketingbot 로그인 → 대시보드 → 리셀러 가입 흐름
- [ ] adminbot 로그인 → 사용자 목록 표시

---

## 🆘 자주 만나는 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| Cloudflare 후 "too many redirects" | 프록시 ON 상태 | DNS only (회색 구름) 로 변경 |
| Vercel SSL 발급 안 됨 (수 시간 대기) | DNS 미전파 또는 Cloudflare 프록시 | nslookup 으로 cname.vercel-dns.com 응답 확인 |
| `prisma: command not found` | npm install 안 함 | 루트에서 `npm install` |
| admin 빌드 시 `engineType "client"` | Prisma adapter 누락 | `@prisma/adapter-pg` 설치 확인 |
| `Cannot find module '@/auth'` | tsconfig paths 미설정 | `apps/admin/tsconfig.json` 의 `baseUrl: "."` 확인 |
| 다른 PC clone 후 `npm run dev` 시 prisma 에러 | client 미생성 | `npx prisma generate` |
| amakers.co.kr 가 깨짐 | 루트 DNS 잘못 건드림 | Cloudflare 에서 아임웹 원래 레코드 복원 |
