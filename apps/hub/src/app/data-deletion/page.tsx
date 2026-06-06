import { Container, Title, Text, Stack, List, Anchor, Divider } from '@mantine/core';

export const metadata = { title: '데이터 삭제 안내 — Amakers' };
export const dynamic = 'force-dynamic';

const COMPANY = '주식회사 어메이커스(amakers)';
const EMAIL = 'help@amakers.co.kr';

export default function DataDeletionPage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={2}>사용자 데이터 삭제 안내</Title>
        <Text size="sm">
          Amakers는 이용자가 언제든지 자신의 데이터를 삭제할 수 있도록 지원합니다. 아래 방법으로 연동 해제 및 데이터 삭제를 요청할 수 있습니다.
        </Text>

        <Title order={4}>방법 1 — 서비스 내에서 직접 삭제</Title>
        <List size="sm" type="ordered" spacing={4}>
          <List.Item><Anchor href="https://app.amakers.co.kr">app.amakers.co.kr</Anchor> 에 로그인</List.Item>
          <List.Item>도구 → 인스타오토 → 계정 화면에서 연결된 계정의 <b>해제</b> 클릭 → 해당 계정 토큰·정보가 즉시 삭제됩니다.</List.Item>
          <List.Item>계정 전체 삭제를 원하시면 아래 이메일로 요청해 주세요.</List.Item>
        </List>

        <Title order={4}>방법 2 — 이메일 요청</Title>
        <Text size="sm">
          <Anchor href={`mailto:${EMAIL}`}>{EMAIL}</Anchor> 로 가입 이메일과 함께 “데이터 삭제 요청”을 보내주시면,
          접수 후 영업일 기준 7일 이내에 계정 및 연동 데이터(토큰·콘텐츠·키 포함)를 완전히 삭제하고 회신드립니다.
        </Text>

        <Divider />
        <Text size="xs" c="dimmed">© {COMPANY} · 문의 {EMAIL}</Text>
      </Stack>
    </Container>
  );
}
