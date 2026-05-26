# naverblogauto ROADMAP

마케팅봇의 블로그 발행 기능을 독립 봇으로 분리 → 점진적 고도화.

## Phase 1 — MVP 스캐폴드 ✅ (이 단계)
- [x] 모노레포 앱 스캐폴드 (`@amakers/blog`, port 3600, NAMING 컨벤션)
- [x] SSO 인증 (다른 봇과 같은 User/세션)
- [x] WordPress 연결 + 자격증명 암호화 (REST 검증)
- [x] WordPress 발행 (제목+본문+대표이미지) + 통합 크레딧 차감
- [x] 대시보드 / 블로그연결 / 작성 UI, 게시글 상태 추적
- [ ] **사용자 액션**: 공유 DB 에 BlogAccount/BlogPost 마이그레이션 (SETUP.md)
- [ ] **검증**: typecheck / build / dev 단독 동작

## Phase 2 — 네이버블로그 (에이전트)
- [ ] 데스크톱 에이전트(Playwright) 경유 네이버블로그 글쓰기 (공개 API 없음)
- [ ] 에이전트 task 큐 + 상태 폴링 (마케팅봇 /api/agent/poll 패턴 이식)
- [ ] 네이버 로그인 세션 암호화 보관 (storage state)

## Phase 3 — 작성 고도화
- [ ] 예약 발행 cron (`/api/cron/dispatch` — SCHEDULED + scheduledAt 도래분)
- [ ] 마크다운 → HTML 변환 + 간단한 에디터(미리보기)
- [ ] 카테고리/태그 선택 (WordPress terms API)
- [ ] AI 글쓰기 (주제 → 제목·본문 초안) — 마케팅봇 lib/ai 이식

## Phase 4 — 플랫폼 통합
- [ ] 통합 결제 페이지 합류 (`packages/billing`)
- [ ] 인스타봇·티스토리봇과 공통 캠페인 (한 콘텐츠 → 다채널 발행)
