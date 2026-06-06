import { Container, Title, Text, Stack, Divider, List, Anchor } from '@mantine/core';

export const metadata = { title: '개인정보처리방침 — Amakers' };
export const dynamic = 'force-dynamic';

const COMPANY = '주식회사 어메이커스(amakers)';
const BIZNO = '501-86-02053';
const CEO = '백승화';
const ADDR = '경기도 부천시 원미구 송내대로73번길 41, 지하1층(상동, 황소빌딩)';
const EMAIL = 'help@amakers.co.kr';
const UPDATED = '2026-06-06';

export default function PrivacyPage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={2}>개인정보처리방침</Title>
        <Text size="sm" c="dimmed">시행일: {UPDATED}</Text>
        <Text size="sm">
          {COMPANY}(이하 “회사”)는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
          본 방침은 회사가 제공하는 Amakers 서비스(SNS·블로그 자동 작성·발행 도구, 이하 “서비스”)에 적용됩니다.
        </Text>

        <Divider />
        <Title order={4}>1. 수집하는 개인정보 항목</Title>
        <List size="sm" spacing={4}>
          <List.Item>계정 정보: 이메일, 비밀번호(암호화 저장), 이름(선택)</List.Item>
          <List.Item>연동 정보: 이용자가 직접 연결한 소셜/블로그 계정의 액세스 토큰 및 계정 식별자(예: Instagram 사용자 ID·사용자명·팔로워 수). 토큰은 암호화(AES-256-GCM)하여 저장합니다.</List.Item>
          <List.Item>이용자가 작성·업로드한 콘텐츠: 게시글 제목·본문·이미지 및 발행 설정</List.Item>
          <List.Item>AI 키(선택): 이용자가 등록한 외부 AI 제공자 API 키(암호화 저장, 이용자 본인 요청 처리에만 사용)</List.Item>
          <List.Item>서비스 이용 기록: 발행 이력, 자동화 실행 로그, 접속 일시</List.Item>
        </List>

        <Title order={4}>2. 개인정보의 이용 목적</Title>
        <List size="sm" spacing={4}>
          <List.Item>회원 식별·인증 및 서비스 제공(콘텐츠 작성·예약·자동 발행)</List.Item>
          <List.Item>이용자가 연결한 소셜/블로그 계정에 이용자 본인을 대신하여 콘텐츠 게시</List.Item>
          <List.Item>서비스 운영·개선, 오류 및 부정 이용 대응</List.Item>
          <List.Item>법령상 의무 이행 및 고객 문의 응대</List.Item>
        </List>

        <Title order={4}>3. 제3자 제공 및 처리위탁</Title>
        <Text size="sm">
          회사는 이용자의 개인정보를 본인의 동의 없이 제3자에게 제공하지 않습니다. 다만 서비스 제공을 위해 이용자가
          직접 연결한 플랫폼(예: Meta(Instagram), 워드프레스, 티스토리)과 이용자가 선택한 AI 제공자에 한하여,
          이용자의 요청을 수행하는 데 필요한 범위에서 데이터가 전송됩니다. 인프라 운영을 위해 클라우드 사업자
          (Vercel, Neon, Cloudflare 등)를 이용할 수 있습니다.
        </Text>

        <Title order={4}>4. 보유 및 이용 기간</Title>
        <Text size="sm">
          개인정보는 회원 탈퇴 또는 연동 해제 시 지체 없이 파기합니다. 연결 해제 시 해당 토큰·계정 정보는 즉시 삭제됩니다.
          단, 관련 법령에서 정한 경우 해당 기간 동안 보관할 수 있습니다.
        </Text>

        <Title order={4}>5. 이용자의 권리</Title>
        <Text size="sm">
          이용자는 언제든지 자신의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있으며, 서비스 내에서 연동 해제 및
          계정 삭제가 가능합니다. 데이터 삭제 안내는 <Anchor href="/data-deletion">데이터 삭제 페이지</Anchor>를 참고하세요.
        </Text>

        <Title order={4}>6. 개인정보의 안전성 확보</Title>
        <Text size="sm">토큰·키 등 민감정보는 암호화 저장하며, 접근 권한 통제 및 전송 구간 암호화(HTTPS)를 적용합니다.</Text>

        <Title order={4}>7. 개인정보 보호책임자 및 문의</Title>
        <List size="sm" spacing={2}>
          <List.Item>회사명: {COMPANY} (사업자등록번호 {BIZNO})</List.Item>
          <List.Item>대표자: {CEO}</List.Item>
          <List.Item>주소: {ADDR}</List.Item>
          <List.Item>문의: <Anchor href={`mailto:${EMAIL}`}>{EMAIL}</Anchor></List.Item>
        </List>

        <Title order={4}>8. 방침의 변경</Title>
        <Text size="sm">본 방침은 법령·서비스 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지합니다.</Text>

        <Divider />
        <Text size="xs" c="dimmed">© {COMPANY}</Text>
      </Stack>
    </Container>
  );
}
