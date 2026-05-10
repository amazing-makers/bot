# Marketingbot → apps/marketing 이전 계획

`c:\marketingbot` 의 코드를 `c:\amakers-platform\apps\marketing` 로 옮기는 단계별 절차.

> ⚠️ **중요**: 이전 작업 전 marketingbot 의 모든 변경사항을 main 브랜치에 커밋하고 백업할 것. 운영 중인 cron / 스케줄 작업이 있으면 일시 중단 권장.

---

## 사전 준비

1. **백업**:
   ```bash
   cp -r /c/marketingbot /c/marketingbot-pre-migration-backup-$(date +%Y%m%d)
   ```
2. **DB 백업** (Supabase 대시보드 → Database → Backups → Manual Backup)
3. **모든 변경 커밋**: `cd /c/marketingbot && git status` 깨끗한지 확인
4. **dev 서버 종료**, cron 일시 정지

---

## Step 1. 코드 이동

```bash
cd /c/marketingbot
# 모든 파일을 apps/marketing 으로 이동 (점 파일 포함)
mv * /c/amakers-platform/apps/marketing/
mv .gitignore .env.local /c/amakers-platform/apps/marketing/  # 점 파일 따로
# .git 은 두고 갈지 옮길지 — 보통 새 모노레포 git history 와 합치기
```

## Step 2. apps/marketing/package.json 수정

이름·workspaces 의존성 추가:

```diff
{
-  "name": "marketingbot",
+  "name": "@amakers/marketing",
   "version": "0.1.0",
   "scripts": { ... 그대로 ... },
   "dependencies": {
+    "@amakers/auth": "*",
+    "@amakers/db": "*",
+    "@amakers/ui": "*",
+    "@amakers/billing": "*",
+    "@amakers/types": "*",
     ... 기존 의존성 그대로 ...
   }
}
```

## Step 3. tsconfig 업데이트

`apps/marketing/tsconfig.json`:

```diff
{
+  "extends": "../../tsconfig.base.json",
   "compilerOptions": {
     ... 기존 ...
+    "paths": {
+      "@/*": ["./src/*"]
+    }
   }
}
```

## Step 4. 코드 변경 (선택, 점진적)

### a) Prisma 클라이언트 import 통합

```diff
- import { prisma } from '@/lib/prisma';
+ import { prisma } from '@amakers/db';
```

prisma schema 도 `packages/db/prisma/schema.prisma` 로 이동.

### b) admin guard 사용

```diff
- function isAdmin(email) { return email === 'help@amakers.co.kr'; }
+ import { isAdminEmail } from '@amakers/auth';
```

### c) commission 계산

```diff
+ import { calcCommission, toYearMonth } from '@amakers/billing';
```

## Step 5. 설치 + 검증

```bash
cd /c/amakers-platform
npm install                              # 모든 워크스페이스 설치
npm run db:generate                      # prisma generate (모노레포 위치에서)
npm run typecheck                        # 모든 워크스페이스 타입체크
npm run build:marketing                  # marketing 앱만 빌드
```

타입 에러 발생 시:
- `paths` 매핑 확인
- 기존 import 경로 (`@/lib/...`) 가 살아있는지 확인
- `node_modules/.prisma` 캐시 삭제 후 재생성

## Step 6. dev 서버 동작 확인

```bash
npm run dev:marketing
```

`http://localhost:3000` 에서 다음 확인:
- 로그인
- 대시보드 진입
- 캠페인 작성·발행
- 시리즈 cron 동작
- 결제 페이지

---

## Step 7. SSO 쿠키 도메인 통합 (pdp 와 합류)

**조건**: pdpbot, designbot 등 다른 봇이 이미 `.amakers.co.kr` 도메인 쿠키 사용 중. 마케팅봇도 같은 도메인으로 변경하면 사용자가 한 번 로그인 → 모든 봇 자동 로그인.

`apps/marketing/src/auth.ts` 또는 `auth.config.ts`:
```diff
+  cookies: process.env.NEXTAUTH_URL?.includes('amakers.co.kr')
+    ? {
+        sessionToken: {
+          name: '__Secure-authjs.session-token',
+          options: { domain: '.amakers.co.kr', secure: true, sameSite: 'lax', httpOnly: true, path: '/' }
+        }
+      }
+    : {}
```

⚠️ **운영 영향**: 이 변경 배포 후 기존 사용자는 1회 자동 로그아웃 (쿠키 이름·도메인 변경). 사용자 공지 권장.

---

## Step 8. Credit 통합 결제 합류

기존 마케팅봇의 발행 흐름을 Credit 차감으로 전환:

```diff
// 발행 publisher (markFailed 또는 SUCCESS 분기)
+ import { spendCredits, CREDIT_RATES } from '@amakers/billing'; // 또는 apps/marketing/src/lib/credit.ts

  if (result.success) {
+   // 클라우드 발행 1 credit, 에이전트 발행 2 credits 차감
+   await spendCredits(userId, {
+     amount: CREDIT_RATES.PUBLISH_CLOUD,
+     bot: 'marketingbot',
+     action: 'PUBLISH',
+     refType: 'ScheduledTask',
+     refId: taskId,
+   });
  }
```

기존 사용자에게 무료 credit 부여 (예: 가입 시 100 credits, 운영 사용자 마이그레이션 시 일괄 충전).

---

## Step 9. Vercel 프로젝트 전환

기존 마케팅봇 Vercel 프로젝트 (`marketingbot`) 를 모노레포 import 로 변경:
1. Vercel → marketingbot 프로젝트 → Settings → Git
2. 기존 `c:\marketingbot` → `amakers-platform` 레포로 변경
3. Root Directory: `apps/marketing`
4. Build Command: `prisma migrate deploy && prisma generate && next build`
5. 기존 환경변수 그대로 + `NEXTAUTH_URL=https://marketingbot.amakers.co.kr` 확인
6. 새 deployment 시도 → 정상 빌드되면 production 적용

⚠️ **rollback 계획**: 만약 새 빌드 fail 시 Vercel 의 "Promote to Production" 으로 이전 deployment 즉시 복원 가능. 마이그레이션 작업 시 기존 deployment URL 메모해 두기.

---

## Step 10. 옛 레포 archive

이전 완료 후:
1. `c:\marketingbot` 레포의 모든 PR/issue 정리
2. README 에 "→ amakers-platform/apps/marketing 으로 이전됨" 알림 추가
3. GitHub 에서 archive (read-only)
4. 로컬 백업 보관 (`c:\marketingbot-archived-2026XXXX`)

---

## 마이그레이션 시점 체크리스트

이전 작업 시작 전:
- [ ] 마케팅봇 main 브랜치에 모든 변경 commit + push
- [ ] Supabase DB Manual Backup
- [ ] 운영 cron 일시 정지 (`/api/cron/*` 임시 disable)
- [ ] 사용자에게 maintenance 공지 (15-30분 다운타임 예상)
- [ ] amakers-platform 레포에 새 PR 만들기 (이전 작업용)
- [ ] 작업 완료 후 dev 환경에서 전체 흐름 테스트

이전 작업 후:
- [ ] dev 서버에서 로그인 / 채널 / 캠페인 / 발행 / 결제 모두 동작 확인
- [ ] Vercel preview 배포 후 production 동일 검증
- [ ] DNS 전환 (마케팅봇 도메인 → 새 Vercel 프로젝트)
- [ ] cron 재활성화
- [ ] 옛 marketingbot 레포 archive
- [ ] 사용자 공지: "이제 한 번 로그인 → 모든 봇 (pdpbot, designbot, ...) 자동 로그인"

## Step 7. 배포

Vercel 프로젝트 설정 변경:
- Root directory: `apps/marketing`
- Build command: `cd ../.. && npm run build:marketing`
- Install command: `cd ../.. && npm install`
- Output directory: `.next`

도메인:
- 기존 `marketingbot.amakers.co.kr` 또는 `*.vercel.app` → `marketing.amakers.co.kr` 로 별칭 추가
- DNS 와일드카드 `*.amakers.co.kr → cname.vercel-dns.com` 설정

---

## Step 8. 이후 — admin / design 앱 추가 시

같은 monorepo 안에 별도 Vercel 프로젝트로 등록:

| 앱 | Vercel 프로젝트 | 도메인 |
|---|---|---|
| apps/admin | `amakers-admin` | `adminbot.amakers.co.kr` |
| apps/marketing | `amakers-marketing` | `marketingbot.amakers.co.kr` |
| apps/design | `amakers-design` | `designbot.amakers.co.kr` |
| apps/mockup | `amakers-mockup` | `mockupbot.amakers.co.kr` |

각 프로젝트는 같은 `DATABASE_URL` 환경변수 공유.

---

## 롤백 계획

이전이 실패하면:
1. apps/marketing 의 코드 삭제
2. 백업 (`/c/marketingbot-pre-migration-backup-...`) 으로 복원
3. 기존 Vercel 배포는 변경 없음 — 영향 없음

## 일정 견적

| 단계 | 소요 시간 |
|---|---|
| 백업 + DB snapshot | 15분 |
| Step 1-3 (이동·설정) | 30분 |
| Step 4 (점진적 import 변경) | 2-4시간 |
| Step 5-6 (검증) | 1-2시간 |
| Step 7 (배포) | 30분 |
| **합계** | **반나절-1일** |

> 💡 한 번에 안 하고 싶으면 Step 1-3, 5만 먼저 하고 (4 는 생략, 기존 import 경로 유지) → 동작 확인 후 천천히 4 진행 가능.
