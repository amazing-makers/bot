/**
 * @amakers/types — 봇/도구 레지스트리 (허브·admin 공용).
 *
 * 허브 도구 그리드와 admin 봇 목록이 이 단일 배열을 import 한다.
 * icon 은 Tabler 아이콘 이름 문자열 — 소비 측(허브 클라이언트)에서 실제 컴포넌트로 매핑.
 */

export type BotStatus = 'live' | 'soon';

export interface BotTool {
  /** 크레딧 ledger 의 bot 식별자와 일치 */
  id: string;
  name: string;
  tagline: string;
  /** 절대 URL (SSO 로 바로 진입) */
  url: string;
  status: BotStatus;
  /** Tabler 아이콘 이름 (허브에서 매핑) */
  icon: string;
  /** Mantine 색상 */
  color: string;
}

export const BOT_TOOLS: BotTool[] = [
  {
    id: 'instaauto',
    name: '인스타오토',
    tagline: '인스타그램 캡션·예약·자동 발행',
    url: 'https://instaauto.amakers.co.kr',
    status: 'live',
    icon: 'instagram',
    color: 'grape',
  },
  {
    id: 'marketingbot',
    name: '마케팅봇',
    tagline: '올인원 SNS·블로그 멀티채널 마케팅',
    url: 'https://marketingbot.amakers.co.kr',
    status: 'live',
    icon: 'speakerphone',
    color: 'blue',
  },
  {
    id: 'naverblogauto',
    name: '네이버블로그오토',
    tagline: '워드프레스·블로그 글 자동 발행',
    url: 'https://naverblogauto.amakers.co.kr',
    status: 'soon',
    icon: 'notebook',
    color: 'green',
  },
  {
    id: 'tistoryauto',
    name: '티스토리오토',
    tagline: '티스토리 글 작성·예약·발행',
    url: 'https://tistoryauto.amakers.co.kr',
    status: 'soon',
    icon: 'pencil',
    color: 'orange',
  },
  {
    id: 'pdpbot',
    name: '상세페이지봇',
    tagline: '상품 상세페이지 AI 자동 생성',
    url: 'https://pdpbot.amakers.co.kr',
    status: 'soon',
    icon: 'layout',
    color: 'teal',
  },
  {
    id: 'designbot',
    name: '디자인봇',
    tagline: 'AI 레이아웃·배경 디자인 에디터',
    url: 'https://designbot.amakers.co.kr',
    status: 'soon',
    icon: 'palette',
    color: 'pink',
  },
  {
    id: 'mockupbot',
    name: '목업봇',
    tagline: '상품 이미지 → 티셔츠·머그 목업',
    url: 'https://mockupbot.amakers.co.kr',
    status: 'soon',
    icon: 'device',
    color: 'violet',
  },
];
