# 🚦 다음 단계 — 오토봇 통합/배포 단일 체크리스트

> **이 문서가 단일 출발점입니다.** 흩어진 문서(DEPLOY.md, DEPLOY_PLAN.md, USER_ACTIONS.md 등)는
> 이전 모놀리스·pdpbot 시절 기록이라 혼동될 수 있음 → **오토봇 분해/배포 작업은 이 문서 + [DEPLOY-auto-bots.md](./DEPLOY-auto-bots.md) 만 보면 됨.**
> 최종 갱신: 2026-05-29

---

## ✅ 코드 작업: 완료 (전부 GitHub에 push 됨)

마케팅봇(모놀리스) → 플랫폼별 독립 오토앱으로 분해하는 작업이 **코드/문서상 완료**되어
`auto` 브랜치와 `feat/decompose-marketing-into-platform-bots` 브랜치 양쪽에 push 되어 있습니다.
(클로드 재설치와 무관하게 안전 — 모두 origin 반영됨)

| 앱 | 경로 | 발행 방식 | 부가기능 | 상태 |
|---|---|---|---|---|
| 인스타오토 | `apps/insta-auto` | IG Graph API + 예약 cron | AI이미지·달력·작성개선·prime-time·BYOK AI캡션 | ✅ 코드 완료 |
| 네이버블로그오토 | `apps/blog-auto` | WordPress REST + 예약 cron | 인스타오토와 기능 동등 | ✅ 코드 완료 |
| 티스토리오토 | `apps/tistory-auto` | 에이전트 큐(Phase2) | 기능 동등 (작성/예약/달력) | ✅ 클라우드측 완료, 발행 에이전트 대기 |

**최근 핵심 커밋**
- `c434bc7` Prisma 지연 초기화 — Vercel 빌드 시 DATABASE_URL 불필요 (빌드 실패 해결)
- `9d4c771` Turborepo 도입 (Turbo 배지 + 바뀐 앱만 빌드)
- `096d297` SSO 가이드 + naverblogauto 도메인 반영
- `0953f80` blog-auto → naverblogauto 리브랜드
- `0f660b5` 봇 → 오토 리브랜드 (insta-auto / blog-auto)

---

## ⏳ 남은 일: 전부 "사용자님이 직접" 해야 하는 외부 액션

코드는 끝났고, 아래는 GitHub/Vercel/Cloudflare/실계정처럼 **이 셸에서 불가능한 것**들입니다.
**순서대로** 진행하세요. 막히면 단계 번호 + 에러를 알려주시면 됩니다.

### STEP 1 — GitHub 기본 브랜치를 `auto` 로 변경  ⏱️ 1분
- GitHub → `amazing-makers/bot` → **Settings → General → Default branch** → ✏️ → `auto` 선택 → Update
- **이유:** Vercel의 Import 화면은 기본 브랜치만 스캔함. 오토앱 3종은 `main`엔 없고 `auto`에만 있어,
  지금 상태로는 Vercel Root Directory 목록에 안 뜸. `auto`로 바꿔야 picker에 오토앱 3종 + Turbo 배지가 보임.
- **안전:** `main`은 그대로 유지 → 기존 bot-admin(main 배포) 무영향. (feat→main diff에서 marketing/pdp/design/mockup 변경 0 확인됨)

### STEP 2 — Cloudflare DNS 3개 추가  ⏱️ 3분
Cloudflare → amakers.co.kr → DNS → Add record (각각 **DNS only / 회색 구름**):
| Type | Name | Target |
|---|---|---|
| CNAME | `instaauto` | `cname.vercel-dns.com` |
| CNAME | `naverblogauto` | `cname.vercel-dns.com` |
| CNAME | `tistoryauto` | `cname.vercel-dns.com` |
> ⛔ `amakers.co.kr` / `www`(아임웹) / MX(이메일)는 건드리지 말 것.

### STEP 3 — 공유 DB에 앱별 테이블 추가 (각 앱 1회)  ⏱️ 5분
> ⚠️ 공유 DB엔 **절대 `prisma db push` 금지** (다른 앱 테이블 DROP 위험). 추가 전용 SQL만 사용.
```powershell
cd C:\Users\eldorado\Documents\클로드\amakers-platform\apps\insta-auto
$env:DATABASE_URL="<운영 DB direct URL>"   # -pooler 없는 호스트
npx prisma db execute --file ./prisma/manual/001_add_instagram_tables.sql
npx prisma db execute --file ./prisma/manual/002_add_userapikey.sql
# blog-auto:    prisma/manual/001_add_blog_tables.sql
# tistory-auto: prisma/manual/001_add_tistory_tables.sql
```

### STEP 4 — Vercel 프로젝트 3개 생성 + SSO 환경변수  ⏱️ 앱당 5분
각 앱마다 Vercel → Add New → Project → Import `amazing-makers/bot`:
1. **Root Directory**: `apps/insta-auto` (각 앱 경로)
2. **Build Command**: `cd ../.. && npm install && cd apps/insta-auto && npx prisma generate && next build`
3. **Install Command**: 비워두기 / **Framework**: Next.js
4. **환경변수** (👇 SSO 핵심 — 잘못 넣으면 아이디 공유 안 됨):

| 환경변수 | 3개 앱 | 값 |
|---|---|---|
| `DATABASE_URL` | **완전 동일** | 공유 DB pooled URL |
| `NEXTAUTH_SECRET` | **완전 동일** | `openssl rand -base64 32` 한 번 생성 후 3곳 동일 |
| `ENCRYPTION_KEY` | **동일 권장** | `openssl rand -hex 32` (한 번 정하면 변경 금지) |
| `NEXTAUTH_URL` | **앱마다 다름** | `https://instaauto.amakers.co.kr` 등 자기 도메인 |
| `CRON_SECRET` | 동일 | `openssl rand -hex 16` (insta/blog 예약발행용) |

5. **Deploy** → **Settings → Domains → Add** → `instaauto.amakers.co.kr` (1~2분 후 SSL 자동)
6. **Settings → Git → Ignored Build Step** 에 `npx turbo-ignore` (바뀐 앱만 재빌드)

> 🔑 **SSO 필수조건:** 3개 앱 모두 `*.amakers.co.kr` 서브도메인이어야 함. `*.vercel.app`이면 쿠키 공유 불가.
> 충족 시 한 곳에서 로그인하면 3개 오토 전부 로그인됨(pchahub 방식).

### STEP 5 — 배포 후 검증
- `https://instaauto.amakers.co.kr/api/health` → `{"ok":true,"bot":"instaauto"}` (3개 앱 모두)
- 한 앱에서 로그인 → 다른 앱 새로고침 → 이미 로그인 상태면 SSO 성공
- Vercel → 프로젝트 → **Cron Jobs** 탭에서 dispatch-scheduled 5분마다 실행 확인 (insta/blog)

---

## 🟨 선택/나중 작업 (지금 안 해도 됨)

- **인스타 실제 발행 확인** — IG 비즈니스 계정 + Page Access Token 필요 (셸에서 불가, 사용자 계정 필요)
- **티스토리 실제 발행** — `tistory-agent/`(데스크톱 Playwright) 에디터 선택자 튜닝 필요.
  카카오 자동로그인 차단 → "수동 1회 로그인 → session.json 저장" 방식. 본인 PC+계정에서 `playwright codegen`으로 튜닝.
- **R2 이미지 업로드** — Cloudflare R2 키 5개 필요 ([DEPLOY-auto-bots.md](./DEPLOY-auto-bots.md) §5). 현재는 AI이미지(Pollinations)/외부 public URL로 동작.
- **Facebook 1-click OAuth** — Meta 앱 ID/Secret 필요 ([DEPLOY-auto-bots.md](./DEPLOY-auto-bots.md) §6). 현재는 토큰 수동 입력으로 동작.
- **기존 봇 → 오토 리브랜드** — 마케팅봇/어드민봇 이름 변경은 Vercel Root Directory + 도메인 재설정이 필요한 **배포 마이그레이션**(위험). 새 오토앱 안정화 후 별도 진행.

---

## 📚 상세 레퍼런스
- **[DEPLOY-auto-bots.md](./DEPLOY-auto-bots.md)** — 오토봇 배포 전체 상세 (DNS/Vercel/SSO/R2/Meta/트러블슈팅)
- [NAMING.md](./NAMING.md) — 신규 봇 추가 시 네이밍 체크리스트
- [DEPLOY.md](./DEPLOY.md) — (구) 모놀리스/기존봇 배포 가이드 (참고용)
