# 🚀 마일스톤 1 배포 — 통합 허브 + 인스타오토 (공유 기반)

> 코드/기반은 모두 완성·검증됨(브랜치 `feat/shared-foundation`). 아래는 **사용자님이 직접** 하는 배포 액션.
> 핵심: 허브(`app.amakers.co.kr`) + 인스타오토(`instaauto.amakers.co.kr`)를 **같은 SSO 환경변수**로 올려, 한 번 로그인·통합 크레딧을 실제로 확인.

## 0. 무엇이 바뀌었나 (요약)
- 모든 봇이 **하나의 Prisma 스키마(`@amakers/db`)·인증(`@amakers/auth`)·크레딧 지갑(`@amakers/billing`)** 공유.
- 신규 **허브 앱**(`apps/hub`): 로그인+회원가입+도구 그리드+크레딧 충전/내역.
- 인스타오토는 자체 schema/인증/크레딧을 버리고 공유 패키지로 전환(검증 빌드 통과).

---

## 1. 브랜치 준비
Vercel이 배포하려면 코드가 production 브랜치에 있어야 합니다. 둘 중 하나:
- **(권장) `feat/shared-foundation` → `auto` 병합** 후 auto에서 배포 (auto가 기본/운영 브랜치).
  ```bash
  git checkout auto && git merge feat/shared-foundation && git push origin auto
  ```
- 또는 각 Vercel 프로젝트 Production Branch를 `feat/shared-foundation`으로 지정.

## 2. Cloudflare DNS — 허브 도메인 추가
amakers.co.kr → DNS → Add record (**DNS only / 회색**):
| Type | Name | Target |
|---|---|---|
| CNAME | `app` | `cname.vercel-dns.com` |
(인스타오토 `instaauto`는 이미 등록돼 있음.)

## 3. 꼬인 Vercel 프로젝트 정리
- 기존 `instaauto`('No Deployment') 프로젝트 **삭제** (Settings → Delete Project). DB/코드 무관.

## 4. Vercel 프로젝트 2개 생성
각각 https://vercel.com/new → `amazing-makers/bot` Import:

| 설정 | **amakers-hub** | **amakers-insta** |
|---|---|---|
| Root Directory | `apps/hub` | `apps/insta-auto` |
| Production Branch | `auto`(또는 feat 브랜치) | 동일 |
| Build Command (Override) | `cd ../.. && npm install && npx turbo run build --filter=@amakers/hub` | `cd ../.. && npm install && npx turbo run build --filter=@amakers/insta-auto` |
| Install Command | 비움 | 비움 |
| Include files outside root | **켜기** | **켜기** |
| 도메인 | `app.amakers.co.kr` | `instaauto.amakers.co.kr` |

> turbo `--filter` 빌드가 `@amakers/db#generate`(Prisma 클라이언트 생성)를 자동 선행합니다.
> "Include files outside Root Directory"를 켜야 `packages/*` 공유 패키지가 빌드에 포함됩니다.

## 5. 환경변수 (⚠️ SSO 핵심 — 두 프로젝트 동일하게)
| Key | 값 | hub | insta |
|---|---|:--:|:--:|
| `DATABASE_URL` | 공유 Neon **pooled** URL (apps/insta-auto/.env.local 의 그 값) | ✅ | ✅ |
| `NEXTAUTH_SECRET` | `op6UolhacFQURTNk6sco5ddnKRc4FNNYAYDBa0Yn3Jo=` (**완전 동일**) | ✅ | ✅ |
| `ENCRYPTION_KEY` | `2bb425c84ac4ac816799da2c910963a56930cafb09a48e708867a1a146d42fa6` (**기존 instaauto 값 재사용**) | ✅ | ✅ |
| `NEXTAUTH_URL` | hub=`https://app.amakers.co.kr` / insta=`https://instaauto.amakers.co.kr` | ✅ | ✅ |
| `CRON_SECRET` | `3f93be3a7a7f93030ab84cceedba613c` | — | ✅ |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | (선택) 크레딧 충전 켤 때만 | ✅ | — |

> ⚠️ `NEXTAUTH_SECRET`·`DATABASE_URL`·`ENCRYPTION_KEY`가 두 곳에서 **다르면 SSO/크레딧/토큰이 깨집니다.** 반드시 동일.
> Stripe 미설정이어도 가입 보너스·관리자 지급 크레딧으로 모든 기능 동작(충전 버튼만 비활성).

## 6. 배포 후 E2E 검증 (마일스톤 1 완료 기준)
1. `https://app.amakers.co.kr/api/health` → `{"ok":true,"bot":"hub"}` (insta도 `/api/health` 200)
2. `app.amakers.co.kr/signup` 가입 → 100 크레딧 지급 → 허브 대시보드 헤더에 잔액 표시
3. 도구 그리드에서 **인스타오토 카드 클릭 → `instaauto.amakers.co.kr` 재로그인 없이 진입**(SSO ✅)
4. 인스타에서 계정 연결 후 발행 → **허브 새로고침 시 크레딧 1 차감 반영**(통합 지갑 ✅)
5. `/billing`에서 사용 내역(PUBLISH 거래) 확인

> 1회 로그인 → 허브·인스타 모두 로그인 + 같은 크레딧 잔액이 두 앱에서 일관되면 **기반 검증 완료**.

---

## 이후(M2~) — 로드맵
- M2: 마케팅봇을 `apps/marketing`으로 이전(공유 auth/db, 구독→크레딧 grant).
- M3: 오토앱(blog/tistory)을 콘텐츠 백본 발행기로 재편.
- M4: 허브 "1작성→다채널 발행" 컴포저. M5: 통계 집계. M6: 데스크톱 에이전트 통합.
