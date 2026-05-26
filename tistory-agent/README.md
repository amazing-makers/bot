# 티스토리 발행 에이전트

티스토리오토(`apps/tistory-auto`)의 발행 큐를 폴링해, **카카오 로그인 세션으로 티스토리에 자동 발행**하는 데스크톱 에이전트입니다.

> 티스토리는 공개 발행 API 가 없어, 브라우저 자동화(Playwright)로 글쓰기 에디터를 직접 조작합니다.
> 카카오 자동 로그인은 차단되므로 **수동 1회 로그인 → 세션 저장 → 재사용** 방식입니다.

## 셋업 (본인 PC)

```bash
cd tistory-agent
npm install
npx playwright install chromium      # 브라우저 1회 설치

cp .env.example .env
#  .env 편집:
#   BASE_URL    = http://localhost:3700  (또는 운영 도메인)
#   AGENT_TOKEN = 티스토리오토 /dashboard/agent 에서 발급한 토큰
```

## 사용

```bash
# 1) 카카오 로그인 (1회) — 헤드풀 브라우저가 뜨면 로그인 후 터미널 Enter
npm run login

# 2) 큐 1회 처리 (테스트)
npm run once

# 3) 지속 폴링 (운영)
npm start
```

흐름: 티스토리오토에서 글 '발행 요청' → 큐(QUEUED) 적재 → 이 에이전트가 폴링해 가져가
(PUBLISHING) → 티스토리 에디터 자동 작성 → 발행 → 결과 보고(PUBLISHED/FAILED).

## ⚠️ 에디터 선택자 튜닝 (중요)

`agent.mjs` 의 `publishPost()` 안의 제목/본문/발행 버튼 **선택자는 best-effort** 이며,
티스토리 에디터 구조/업데이트에 따라 맞지 않을 수 있습니다. 실제 블로그에서 확인하세요:

```bash
npx playwright codegen https://<당신블로그>.tistory.com/manage/newpost/
```

클릭·입력하면서 Playwright 가 생성하는 선택자를 복사해 `publishPost()` 의 TODO 부분에 반영하면 됩니다.
(headful 로 동작하니 실패 시 브라우저 화면에서 어디서 멈췄는지 확인 가능)

## 다음 단계 (선택)
- 대표 이미지(photoUrl) 업로드 자동화
- 카테고리/태그/공개범위 설정
- 세션 만료 감지 → 재로그인 알림
- 헤드리스 모드 + 트레이 상주 / 자동 시작
