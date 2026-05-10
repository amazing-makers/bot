# pdpbot Setup 가이드 (사용자님이 직접 진행)

**총 소요 시간:** 약 30~40분 (로컬까지) + 15분 (운영 배포까지)

> 막히는 단계 있으면 그 단계 번호 알려주시면 즉시 도와드립니다.

---

## 🎯 전체 흐름

```
1. API 키 3개 발급 (10분)              ← OpenAI · Anthropic · Replicate
2. R2 bucket 확인 (5분)                 ← 마케팅봇과 공유 또는 새로 생성
3. .env.local 만들기 (5분)
4. npm install + prisma migrate (5분)
5. 본인 계정에 credits 충전 (1분)        ← 테스트용
6. 로컬 dev 실행 + 테스트 (10분)
———————— 여기까지 로컬 검증 ————————
7. Vercel 새 프로젝트 + 배포 (10분)
8. Cloudflare DNS (5분)
———————— pdpbot.amakers.co.kr 운영 ————————
```

---

## Step 1. API 키 3개 발급 (10분)

### 1-1. OpenAI (GPT-4 Vision OCR)

1. https://platform.openai.com/api-keys 접속 (계정 없으면 가입)
2. **"+ Create new secret key"**
3. 이름: `pdpbot` → **Create**
4. 표시된 `sk-...` 복사 (한 번만 보여줌!)
5. 결제 카드 등록 안 했으면 **Settings → Billing** 에서 카드 + $10 정도 미리 충전

### 1-2. Anthropic (Claude Opus 번역)

1. https://console.anthropic.com/settings/keys
2. **"Create Key"**
3. 이름: `pdpbot` → **Create**
4. 표시된 `sk-ant-...` 복사
5. **Settings → Plans** 에서 카드 + $10 정도 충전

### 1-3. Replicate (FLUX 1.1 Pro Fill 인페인팅)

1. https://replicate.com/account/api-tokens
2. **"Create token"**
3. 이름: `pdpbot` → **Create**
4. 표시된 `r8_...` 복사
5. **Account → Billing** 에서 카드 + $10 정도 충전

> 💡 세 키는 사용량 기반 과금 — 미리 $10씩만 충전해도 1상품 처리 약 $0.5 ~ $1 (이미지 5-10장) 이라 충분히 테스트 가능.

---

## Step 2. R2 bucket 확인 (5분)

### 옵션 A: 마케팅봇과 같은 bucket 사용 (권장)
마케팅봇 `.env.local` 에서 다음 5개 값을 그대로 복사:
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`

→ 이미지가 같은 bucket 에 저장됨. key prefix `pdp/` 로 폴더 분리되어 충돌 X.

### 옵션 B: 새 bucket 만들기
1. https://dash.cloudflare.com → R2 → **Create bucket**
2. 이름: `amakers-pdp`
3. 만든 후 **Settings → API tokens → Create token**
4. Permissions: **Object Read & Write**
5. 표시된 endpoint + access key + secret 메모

---

## Step 3. `.env.local` 만들기 (5분)

PowerShell 에서:

```powershell
cd c:\amakers-platform\apps\pdp
copy .env.example .env.local
notepad .env.local
```

`.env.example` 의 모든 항목을 채워주세요. 특히:

| 항목 | 어디서 |
|---|---|
| `DATABASE_URL` | 마케팅봇 `.env.local` 그대로 |
| `NEXTAUTH_SECRET` | 마케팅봇 `.env.local` 그대로 (SSO 위해 필수 동일) |
| `OPENAI_API_KEY` | Step 1-1 |
| `ANTHROPIC_API_KEY` | Step 1-2 |
| `REPLICATE_API_TOKEN` | Step 1-3 |
| `R2_*` (5개) | Step 2 |

저장 후 닫기.

---

## Step 4. 의존성 설치 + DB 마이그레이션 (5분)

PowerShell 에서:

```powershell
cd c:\amakers-platform
npm install                                # workspace 모든 의존성 설치 (한 번만)

cd apps/pdp
npx prisma generate                        # Prisma client 생성
npx prisma migrate dev --name pdp_initial  # 운영 DB 에 새 테이블 4개 추가
                                           # (UserCredit, CreditTransaction, Product, ScrapedImage, TextRegion, OutputImage)
```

마이그레이션 후 결과:
```
Applied migration: 20260510xxxxxx_pdp_initial
```

---

## Step 5. 본인 계정에 credits 충전 (1분, 테스트용)

```powershell
cd c:\amakers-platform\apps\pdp
npm run seed:credits -- 1000
```

→ 본인 (`admin@amakers.co.kr`) 계정에 1000 credits 충전 (이미지 약 24장 처리 가능).

---

## Step 6. 로컬 dev 실행 + 테스트 (10분)

```powershell
cd c:\amakers-platform\apps\pdp
npm run dev
```

→ http://localhost:3200 자동 열림 (또는 직접 입력).

### 테스트 시나리오
1. 메인 페이지 → URL 입력 칸에 다음 중 하나 붙여넣기:
   - 타오바오: `https://item.taobao.com/item.htm?id=...`
   - 쿠팡: `https://www.coupang.com/vp/products/...`
   - 또는 한국어 글자 많은 다른 사이트
2. **이미지 추출** 버튼 클릭 → 갤러리에 이미지들 표시
3. 갤러리에서 이미지 1장 클릭
4. Modal 진행 상황 4단계 → 1-3분 후 결과
5. before / after 비교 + **PNG 다운로드**

### 잘 안 되는 케이스 + 즉시 진단
| 증상 | 원인 / 해결 |
|---|---|
| Modal에 "잔액 부족" | Step 5 다시 (credit 더 충전) |
| "이미지 fetch 실패" | 사이트 URL 이 봇 차단 (Cloudflare 등) — 다른 URL 시도 |
| Modal 영원히 진행 중 | 5분 timeout — Replicate FLUX 응답 지연 |
| 글자가 깨끗하게 안 지워짐 | FLUX 마스크 영역 부족 — bbox 여백 늘리기 (다음 polish) |
| 한글 폰트 깨짐 | `public/fonts/Pretendard.ttf` 미설치 — 다음 polish |

---

## Step 7. Vercel 배포 (10분, 로컬 검증 후)

1. https://vercel.com/dashboard → **"Add New" → "Project"**
2. **amazing-makers/bot** 레포 선택 (이미 marketingbot 등 import 한 계정이면 보임)
3. **Project Name**: `pdpbot`
4. **Root Directory**: `apps/pdp` (중요!)
5. **Framework**: Next.js (자동 감지)
6. **Build Command**: `prisma migrate deploy && prisma generate && next build` (override)
7. **Environment Variables** — `.env.local` 의 모든 값 복사해 등록:
   - 모든 `*_KEY`, `*_TOKEN`, `*_SECRET` 은 **Sensitive 마크**
   - `NEXTAUTH_URL` 만 다르게: `https://pdpbot.amakers.co.kr`
8. **Deploy** 클릭 → 빌드 ~3분
9. 빌드 성공 시 임시 URL (예: `pdpbot-xxx.vercel.app`) 활성

---

## Step 8. Cloudflare DNS (5분)

1. https://dash.cloudflare.com → **amakers.co.kr** 도메인 → **DNS**
2. **Add record**:
   - Type: **CNAME**
   - Name: `pdpbot`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **DNS only** (회색 구름) ⚠️ 절대 주황색 X
3. 저장 → 1-2분 propagation
4. Vercel → pdpbot 프로젝트 → **Settings → Domains** → **Add `pdpbot.amakers.co.kr`**
5. Vercel 자동 SSL 발급 (1-2분)

→ https://pdpbot.amakers.co.kr 접속 → 정상 동작.

---

## Step 9. 운영 환경에 자기 자신 credit 충전

운영 DB 에도 마찬가지:

```powershell
# Vercel CLI로 production env pull
vercel env pull .env.production --environment=production
# DATABASE_URL 이 production 값으로 채워짐
$env:DATABASE_URL = "<production DATABASE_URL>"
npm run seed:credits -- 5000
```

→ 운영 DB 의 본인 계정에 5000 credits 충전 (이미지 약 120장).

---

## 📋 진행 체크리스트

각 단계 끝나면 ✅ 체크:
- [ ] Step 1-1 OpenAI 키 발급 + 카드 충전
- [ ] Step 1-2 Anthropic 키 발급 + 카드 충전
- [ ] Step 1-3 Replicate 키 발급 + 카드 충전
- [ ] Step 2 R2 설정 (마케팅봇 bucket 또는 새로 생성)
- [ ] Step 3 `.env.local` 모든 값 채움
- [ ] Step 4 `npm install` + `prisma migrate dev` 성공
- [ ] Step 5 credit 충전 완료
- [ ] Step 6 로컬 `http://localhost:3200` 접속 → 이미지 1장 처리 성공
- [ ] Step 7 Vercel 배포 + 빌드 성공
- [ ] Step 8 DNS + `pdpbot.amakers.co.kr` 접속 가능
- [ ] Step 9 운영 credit 충전

---

## 막힐 때

각 단계의 실패 메시지를 그대로 복붙해 보내주시면 즉시 진단합니다. 특히:
- Step 4 prisma migrate 에러 (P3005 baseline 문제 등)
- Step 6 Modal 에서 처리 실패
- Step 7 Vercel 빌드 에러

다음 세션에 이어가도 됩니다 — `HANDOFF.md` 가 다 기록되어 있어 컨텍스트 그대로 복구 가능합니다.
