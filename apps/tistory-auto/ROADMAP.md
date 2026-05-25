# TistoryAuto ROADMAP

마케팅봇의 티스토리 발행을 독립 봇으로 분리. 티스토리는 공개 API가 없어 발행은 에이전트 의존.

## Phase 1 — MVP 스캐폴드 ✅ (이 단계)
- [x] 모노레포 앱 (`@amakers/tistory-auto`, port 3700, NAMING 컨벤션)
- [x] SSO 인증 (다른 봇과 같은 User/세션)
- [x] 블로그 등록 (TistoryAccount) + 글 작성·예약 (TistoryPost) + 상태 추적
- [x] 통합 크레딧 골격 (bot=tistoryauto)
- [x] 발행 버튼 = 에이전트 Phase2 안내 (글 초안 보존)
- [ ] **사용자 액션**: 공유 DB 에 TistoryAccount/TistoryPost 마이그레이션 (SETUP.md)

## Phase 2 — 데스크톱 에이전트 발행 (핵심)
- [ ] 카카오 로그인 세션 확보 + 암호화 보관 (encryptedSecret)
- [ ] Playwright 에이전트: 티스토리 글쓰기 에디터 자동화 (제목·본문·이미지·공개설정)
- [ ] 에이전트 task 큐 + 폴링 (마케팅봇 /api/agent/poll 패턴 이식)
- [ ] 예약 발행 cron → 에이전트 디스패치

## Phase 3 — 작성 고도화
- [ ] 마크다운 → HTML + 미리보기 에디터
- [ ] 카테고리/태그/공개범위 옵션
- [ ] AI 글쓰기 (주제 → 제목·본문 초안)

## Phase 4 — 플랫폼 통합
- [ ] 통합 결제 페이지 합류 (packages/billing)
- [ ] 인스타오토·블로그오토와 공통 캠페인 (한 콘텐츠 → 다채널)
