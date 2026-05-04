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
| apps/admin | `amakers-admin` | `admin.amakers.co.kr` |
| apps/marketing | `amakers-marketing` | `marketing.amakers.co.kr` |
| apps/design | `amakers-design` | `design.amakers.co.kr` |

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
