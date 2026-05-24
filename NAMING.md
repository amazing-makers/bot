# amakers 명칭 컨벤션

**작성일:** 2026-05-10

> 봇 추가될 때마다 같은 패턴 적용 → 사용자/개발자 혼란 방지.

---

## 봇 단위 명칭 (5가지 영역, 모두 일관)

| 영역 | 패턴 | 예시 |
|---|---|---|
| **한국어 호칭** | `<용도>봇` | 마케팅봇, 어드민봇, 디자인봇, 상세페이지봇 |
| **영문 short id** | `<bot>` (lowercase) | marketing, admin, design, pdp |
| **영문 풀 호칭** | `<bot>bot` (한 단어) | marketingbot, adminbot, designbot, pdpbot |
| **도메인** | `<bot>bot.amakers.co.kr` | marketingbot.amakers.co.kr, pdpbot.amakers.co.kr |
| **모노레포 디렉토리** | `apps/<bot>` | apps/marketing, apps/admin, apps/pdp |
| **npm 패키지명** | `@amakers/<bot>` | @amakers/marketing, @amakers/pdp |
| **Vercel 프로젝트명** | `<bot>bot` | marketingbot, pdpbot, designbot |

> ⚠️ 현재 어드민봇 Vercel 프로젝트는 `bot-admin` (옛 컨벤션). 운영 중이라 rename 비추 — 추후 새 봇은 `<bot>bot` 패턴.

---

## 현재 봇 (2026-05-10)

| 봇 | 영문 id | 도메인 | 디렉토리 | 패키지 | Vercel | 상태 |
|---|---|---|---|---|---|---|
| 마케팅봇 | marketing | marketingbot.amakers.co.kr | apps/marketing (예정) / `c:\marketingbot` (현재 별도 레포) | @amakers/marketing | marketingbot | ✅ 운영 |
| 어드민봇 | admin | adminbot.amakers.co.kr | apps/admin | @amakers/admin | bot-admin (옛) | ✅ 운영 |
| 상세페이지봇 | pdp | pdpbot.amakers.co.kr (예정) | apps/pdp | @amakers/pdp | pdpbot (예정) | 🆕 scaffold 완료 |
| 디자인봇 | design | designbot.amakers.co.kr (예정) | apps/design | @amakers/design | designbot (예정) | 📝 README만 |
| 모형봇 | mockup | mockupbot.amakers.co.kr (예정) | apps/mockup | @amakers/mockup | mockupbot (예정) | 📝 미시작 |
| 인스타봇 | instagram | instabot.amakers.co.kr (예정) | apps/instagram | @amakers/instagram | instabot (예정) | 🆕 scaffold (마케팅봇 IG 분리) |

> ℹ️ 인스타봇은 "마케팅봇"을 **플랫폼별**(인스타·블로그·티스토리)로 쪼개는 새 분할 축의 첫 봇.
> 영문 풀 호칭은 한 단어 컨벤션상 `instabot` (instagrambot 아님), 디렉토리·패키지는 `instagram`.

---

## 코드 컨벤션

### 환경변수
```
# 모든 봇 공통 (같은 값)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...           # 32+ chars, 모든 봇 동일 → SSO JWT 호환
ENCRYPTION_KEY=...            # AES-256-GCM credentials 암호화

# 봇별 다름
NEXTAUTH_URL=https://<bot>bot.amakers.co.kr   # 봇별 자기 도메인
PORT=...                                       # dev 포트 분리 (3000 marketing / 3100 admin / 3200 pdp / 3300 design)

# AI 키 (필요한 봇만)
OPENAI_API_KEY=...            # pdpbot, marketingbot AI 캡션
ANTHROPIC_API_KEY=...         # pdpbot, marketingbot
REPLICATE_API_TOKEN=...       # pdpbot 인페인팅
DEEPL_API_KEY=...             # marketingbot 번역

# 통합 결제 (Stripe)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# 외부 채널 (필요한 봇만)
META_APP_ID, META_APP_SECRET  # marketingbot Instagram OAuth
R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL  # 이미지 저장 (모든 봇 공유)
```

### Dev 포트 (로컬 동시 실행)
| 봇 | 포트 |
|---|---|
| marketing | 3000 |
| admin | 3100 |
| pdp | 3200 |
| design | 3300 |
| mockup | 3400 |
| instagram | 3500 |

### DB 테이블 prefix
- 공유 테이블 (모든 봇 사용): `User`, `Workspace`, `UserCredit`, `CreditTransaction`, `Subscription` — prefix 없음.
- 봇 전용 테이블: 의미 있는 모델명 그대로 (예: `Product`, `ScrapedImage` — pdp 전용이지만 prefix 없음). 충돌 방지를 위해 카테고리 명확하면 prefix 불필요.
- 충돌 시 (예: 양쪽이 `Channel` 모델 갖고 있음) → `MarketingChannel` (이미 적용됨), `PdpChannel` 식으로 prefix.

### Credit Transaction `bot` 필드값
```ts
type Bot = 'marketingbot' | 'adminbot' | 'pdpbot' | 'designbot' | 'mockupbot' | 'instabot';
```
모든 사용량 기록에 봇 명시 → 사용자 대시보드 / 분석에서 봇별 분리 가능.

---

## 새 봇 추가 시 체크리스트

1. [ ] `apps/<bot>/` 디렉토리 생성
2. [ ] `apps/<bot>/package.json` — name: `@amakers/<bot>`, dev port 새 번호
3. [ ] `apps/<bot>/README.md` — 비전 + 핵심 기능
4. [ ] `apps/<bot>/ROADMAP.md` — Phase 별 마일스톤
5. [ ] Prisma schema — 공유 모델 정의 (User 등) + 봇 전용 모델
6. [ ] `src/auth.ts` + `auth.config.ts` — SSO 쿠키 도메인 `.amakers.co.kr`
7. [ ] `src/lib/prisma.ts` — globalThis 캐시 + pg.Pool max=1
8. [ ] `src/lib/credit.ts` — spendCredits / addCredits (CREDIT_RATES 봇별 추가)
9. [ ] `NAMING.md` 표 업데이트 — 새 봇 추가
10. [ ] `DEPLOY_PLAN.md` 봇 list 업데이트
11. [ ] Vercel 새 프로젝트 + 환경변수 등록
12. [ ] Cloudflare DNS — `<bot>bot.amakers.co.kr` CNAME → `cname.vercel-dns.com`
