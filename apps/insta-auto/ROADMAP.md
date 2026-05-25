# instaauto ROADMAP

마케팅봇의 인스타 기능을 독립 봇으로 분리 → 점진적 고도화. 통합(SSO·크레딧)은 플랫폼 공통 패키지로 자동.

## Phase 1 — MVP 스캐폴드 ✅ (이 단계)
- [x] 모노레포 앱 스캐폴드 (`@amakers/instagram`, port 3500, NAMING 컨벤션)
- [x] SSO 인증 (다른 봇과 같은 User/세션)
- [x] 계정 연결 + 토큰 암호화 (Graph API 검증)
- [x] Graph API 발행 (이미지, 즉시 발행) + 통합 크레딧 차감
- [x] 대시보드 / 계정 / 작성 UI, 게시물 상태 추적
- [ ] **사용자 액션**: 공유 DB 에 InstagramAccount/InstagramPost 마이그레이션 (SETUP.md)
- [ ] **검증**: typecheck / build / dev 단독 동작

## Phase 2 — 발행 고도화
- [ ] 예약 발행 cron (`/api/cron/dispatch` — SCHEDULED + scheduledAt 도래분 처리)
- [ ] 캐러셀(다중 이미지) + REELS 비디오 발행
- [ ] 이미지 비율 자동 변환 (sharp 1:1 / 4:5 / 9:16) — 마케팅봇 media 이식
- [ ] Facebook OAuth 1-click 연동 (토큰 수동 입력 제거 — 마케팅봇 최신 커밋 이식)

## Phase 3 — AI & 운영
- [ ] AI 캡션 생성 (주제 → 캡션 + 해시태그) — 마케팅봇 lib/ai/caption 이식
- [ ] AI 이미지 생성 연동
- [ ] 발행 실패 알림 (이메일/웹푸시) + 토큰 만료 사전 경고
- [ ] 인사이트 (게시물 도달/좋아요) Graph API insights 수집

## Phase 4 — 플랫폼 통합
- [ ] 통합 결제 페이지 합류 (`packages/billing`)
- [ ] 메인 허브에서 instaauto 진입 (SSO)
- [ ] 블로그봇·티스토리봇과 공통 캠페인 개념 (한 콘텐츠 → 다채널) 연동
