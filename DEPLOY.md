# 배포·온보딩 가이드

> 이 문서는 (1) 다른 컴퓨터에서 작업 이어가기, (2) Supabase DB 마이그레이션, (3) Vercel 배포 + 도메인 연결까지 단계별로 안내합니다.

---

## 📦 Phase A. GitHub 에 Push (지금 작업 컴퓨터에서)

### A-1. GitHub CLI 로그인 (1회만)

```bash
gh auth login
# → GitHub.com / HTTPS / Login with web browser 선택
```

### A-2. marketingbot Push

이미 `origin = github.com/amazing-makers/marketingbot.git` 등록됨. 14개 미push 커밋 (Phase 5-13) 한 번에 push:

```bash
cd /c/marketingbot
git push origin main
```

### A-3. amakers-platform 신규 Repo 생성 + Push

```bash
cd /c/amakers-platform

# 옵션 1: gh CLI 로 자동 생성 (private 권장)
gh repo create amazing-makers/amakers-platform \
  --private \
  --source=. \
  --remote=origin \
  --push \
  --description "Amakers multi-bot platform monorepo (admin + marketing + design)"

# 옵션 2: 웹에서 직접 만든 후 수동 연결
# 1) https://github.com/new 에서 amakers-platform repo 생성 (Initialize 체크 X)
# 2) 아래 명령:
#    git remote add origin https://github.com/amazing-makers/amakers-platform.git
#    git push -u origin main
```

---

## 💻 Phase B. 다른 컴퓨터에서 이어 작업

### B-1. clone + 환경 셋업

```bash
# marketingbot
git clone https://github.com/amazing-makers/marketingbot.git
cd marketingbot
npm install
cp .env.example .env.local       # 또는 운영 .env.local 복사
# .env.local 에 DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_AI_API_KEY 등 채우기
npx prisma generate
npm run dev

# amakers-platform
git clone https://github.com/amazing-makers/amakers-platform.git
cd amakers-platform
npm install                       # 모든 워크스페이스 설치 (~1분)
cd apps/admin
cp .env.example .env.local
# DATABASE_URL, NEXTAUTH_SECRET, ADMIN_EMAILS, ADMIN_PASSWORD 채우기
npx prisma generate
cd ../..
npm run dev:admin                 # http://localhost:3100
```

### B-2. 환경변수 동기화 팁

⚠️ **환경변수는 절대 git 에 commit 하지 마세요** (`.env.local` 은 `.gitignore` 에 포함됨).

대안:
- **1Password / Bitwarden** 에 저장 → 다른 컴퓨터에서 복사
- **Doppler / Infisical** (무료 시크릿 매니저) → CLI 로 sync
- **Vercel CLI** 로 직접 pull: `vercel env pull .env.local`

추천: Vercel 배포 후 `vercel env pull` 로 단일 진실 소스 유지.

---

## 🗄 Phase C. 운영 Supabase DB 마이그레이션 (리셀러 테이블 추가)

> ⚠️ **운영 DB 변경**입니다. 먼저 백업하세요.

### C-1. Supabase 백업 (필수)

1. https://supabase.com/dashboard → 프로젝트 선택
2. **Database → Backups → Manual backup** 클릭
3. 1-2분 대기 → "Backup completed" 확인

### C-2. 마이그레이션 적용

```bash
cd /c/marketingbot
# DATABASE_URL 이 .env.local 에 있는지 확인
cat .env.local | grep DATABASE_URL

# 적용
npx prisma migrate deploy

# 출력 예시:
# Applying migration `20260504_reseller_referral`
# The following migration(s) have been applied:
# migrations/
#   └─ 20260504_reseller_referral/
```

### C-3. 적용 확인

```bash
# Prisma Studio 로 새 테이블 확인
npx prisma studio
# → http://localhost:5555 → Reseller / ReferralCode / ReferralCommission 보이는지
```

또는 Supabase 대시보드 → Table Editor 에서 확인.

### C-4. 롤백 (필요 시)

```sql
-- Supabase SQL Editor 에서 실행
DROP TABLE IF EXISTS "ReferralCommission" CASCADE;
DROP TABLE IF EXISTS "ReferralCode" CASCADE;
DROP TABLE IF EXISTS "Reseller" CASCADE;
ALTER TABLE "User" DROP COLUMN IF EXISTS "referredByCodeId";
```

---

## 🌐 Phase D. Vercel 배포 + 도메인 연결

### D-1. amakers.co.kr 도메인 DNS 설정

도메인 등록처 (가비아·후이즈·Cloudflare 등) 관리 페이지에서:

```
Type    Name                Value
─────────────────────────────────────────────────────────
CNAME   marketing           cname.vercel-dns.com
CNAME   admin               cname.vercel-dns.com
CNAME   design              cname.vercel-dns.com  (향후)
CNAME   *                   cname.vercel-dns.com  (와일드카드 — 추천)
```

> 💡 와일드카드 1개 등록하면 새 봇 추가 시 DNS 수정 불필요. 단, Cloudflare 는 와일드카드 + 서브도메인 우선순위 주의.

### D-2. Vercel 프로젝트 등록

#### marketingbot (기존)

```bash
cd /c/marketingbot
npx vercel              # 첫 실행 시 link 안내
npx vercel --prod       # 운영 배포
```

대시보드:
- https://vercel.com/dashboard → marketingbot 프로젝트
- **Settings → Domains** → `marketing.amakers.co.kr` 추가
- **Settings → Environment Variables** → DATABASE_URL, NEXTAUTH_SECRET, AI 키 등 모두 입력

#### admin (신규)

```bash
cd /c/amakers-platform/apps/admin
npx vercel              # 새 프로젝트로 link
```

Vercel 프로젝트 설정 (대시보드):
- **Build & Development Settings**:
  - Root Directory: `apps/admin`
  - Build Command: `cd ../.. && npm install && cd apps/admin && npx prisma generate && next build`
  - Install Command: 비워두기 (위 build command 가 처리)
  - Output Directory: `.next`
  - Framework Preset: Next.js
- **Environment Variables**:
  ```
  DATABASE_URL              postgresql://... (marketingbot 과 동일)
  NEXTAUTH_SECRET           (32자 이상 랜덤 문자열, openssl rand -base64 32)
  NEXTAUTH_URL              https://admin.amakers.co.kr
  ADMIN_EMAILS              help@amakers.co.kr
  ADMIN_PASSWORD            (강력한 비밀번호 — 추후 marketingbot bcrypt 통합 예정)
  ```
- **Domains**: `admin.amakers.co.kr` 추가

### D-3. cron 등록 (Vercel)

`marketingbot/vercel.json` 에 추가 (이미 다른 cron 있으면 schedules 배열에 append):

```json
{
  "crons": [
    { "path": "/api/cron/calculate-commissions", "schedule": "0 3 1 * *" },
    { "path": "/api/cron/dispatch-series",       "schedule": "*/5 * * * *" }
  ]
}
```

`CRON_SECRET` 환경변수 설정 필수 (Authorization 헤더 검증용).

### D-4. 배포 검증

```
✅ https://marketing.amakers.co.kr           → 마케팅봇 랜딩 / 로그인
✅ https://marketing.amakers.co.kr/dashboard → 로그인 후 대시보드
✅ https://marketing.amakers.co.kr/dashboard/reseller → 리셀러 가입
✅ https://marketing.amakers.co.kr/register?ref=TEST  → 추천 코드 배지 표시
✅ https://admin.amakers.co.kr               → admin 로그인
✅ https://admin.amakers.co.kr/users         → 사용자 목록 (실 데이터)
```

---

## 🔄 Phase E. 일상 워크플로

```bash
# 작업 시작 (다른 컴퓨터에서)
git pull origin main
npm install                    # package.json 변경 있으면

# 작업 중
npm run dev:admin              # 또는 cd /marketingbot && npm run dev

# 변경사항 commit + push
git add .
git commit -m "feat(xx): 변경 내용"
git push origin main

# Vercel 자동 배포 (push 시 자동 트리거 — preview 또는 production 브랜치 설정 따라)
```

### Preview 배포 활용

```bash
git checkout -b feature/new-bot
# 작업
git push origin feature/new-bot
# → Vercel 이 자동 preview URL 생성 (예: marketingbot-git-feature-new-bot.vercel.app)
# → PR 만들면 자동 댓글에 preview 링크
```

---

## 📋 체크리스트

- [ ] gh CLI 로그인 완료
- [ ] marketingbot push 완료 (14 commits)
- [ ] amakers-platform repo 생성 + push 완료
- [ ] Supabase 백업 → migrate deploy 완료
- [ ] Reseller 테이블 생성 확인 (Prisma Studio)
- [ ] DNS 와일드카드 또는 marketing/admin 서브도메인 등록
- [ ] marketingbot Vercel 환경변수 + 도메인 설정
- [ ] admin Vercel 프로젝트 생성 + 환경변수 + 도메인
- [ ] cron 등록 (vercel.json)
- [ ] 다른 컴퓨터에서 clone + dev 동작 확인

---

## 🆘 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `prisma: command not found` | 워크스페이스 의존성 미설치 | `npm install` 루트에서 |
| admin 빌드 시 `engineType "client"` 에러 | Prisma adapter 누락 | `npm install @prisma/adapter-pg pg` |
| `Cannot find module '@/auth'` | tsconfig paths 미설정 | `tsconfig.json` 에 `baseUrl: "."` 명시 |
| Vercel 배포 시 `referralCode` 모델 없음 | DB 마이그레이션 미적용 | Phase C 진행 |
| 다른 컴퓨터에서 `npm run dev` 시 prisma client 없음 | generate 누락 | `npx prisma generate` |
| 도메인 연결 후 SSL 에러 | Vercel SSL 자동 발급 대기 | 수 분 대기 (보통 1-5분) |
