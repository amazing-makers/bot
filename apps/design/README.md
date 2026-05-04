# apps/design — 디자인봇 (예정)

**비유:** Figma·미리캔버스·Canva 같은 디자인 툴 + AI 자동 생성.

## 핵심 기능 (계획)

- AI 디자인 템플릿 생성 (포스터·SNS 카드·명함 등)
- Figma 임포트 (이미 존재하는 figma-mcp 활용)
- 캔버스 에디터 (fabric.js 또는 konva)
- 브랜드 키트 (색상·로고·폰트 저장)
- 마케팅봇과 연동: 디자인 → 자동 발행

## 의존 패키지

- `@amakers/auth` (공통 인증)
- `@amakers/db` (User, Workspace 공유)
- `@amakers/ui` (Mantine + 브랜드 토큰)
- `@amakers/billing` (구독·사용량)

## 시작 시점

마케팅봇 안정화 + admin/reseller 정상 작동 후 착수.
