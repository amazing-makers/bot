import { Container, Title, Text, Stack, Divider, List, Anchor } from '@mantine/core';

export const metadata = { title: '서비스 이용약관 — Amakers' };
export const dynamic = 'force-dynamic';

const COMPANY = '주식회사 어메이커스(amakers)';
const BIZNO = '501-86-02053';
const CEO = '백승화';
const ADDR = '경기도 부천시 원미구 송내대로73번길 41, 지하1층(상동, 황소빌딩)';
const EMAIL = 'help@amakers.co.kr';
const UPDATED = '2026-06-06';

export default function TermsPage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title order={2}>서비스 이용약관</Title>
        <Text size="sm" c="dimmed">시행일: {UPDATED}</Text>

        <Title order={4}>제1조 (목적)</Title>
        <Text size="sm">
          본 약관은 {COMPANY}(이하 “회사”)가 제공하는 Amakers 서비스(SNS·블로그 콘텐츠 작성 및 자동 발행 도구, 이하 “서비스”)의
          이용에 관한 회사와 이용자 간의 권리·의무 및 책임사항을 규정합니다.
        </Text>

        <Title order={4}>제2조 (서비스 내용)</Title>
        <List size="sm" spacing={4}>
          <List.Item>AI 기반 글·이미지 생성 및 편집</List.Item>
          <List.Item>이용자가 연결한 소셜/블로그 계정에 대한 콘텐츠 게시·예약·자동 발행</List.Item>
          <List.Item>반복 자동화(주기/정시 발행, 소스 연동 등)</List.Item>
        </List>

        <Title order={4}>제3조 (계정 연결 및 이용자 책임)</Title>
        <List size="sm" spacing={4}>
          <List.Item>이용자는 본인이 적법한 권한을 가진 계정만 연결해야 합니다.</List.Item>
          <List.Item>서비스를 통해 발행되는 콘텐츠의 내용과 적법성에 대한 책임은 이용자에게 있습니다.</List.Item>
          <List.Item>이용자는 연결한 각 플랫폼(예: Meta/Instagram, 워드프레스, 티스토리)의 정책과 약관을 준수해야 합니다.</List.Item>
        </List>

        <Title order={4}>제4조 (금지행위)</Title>
        <Text size="sm">스팸·불법·타인의 권리를 침해하는 콘텐츠 발행, 플랫폼 정책 위반, 서비스의 비정상적 이용을 금지합니다.</Text>

        <Title order={4}>제5조 (요금)</Title>
        <Text size="sm">서비스는 기본 무료로 제공되며, AI 기능은 이용자가 등록한 본인 API 키로 동작합니다. 유료 기능 도입 시 별도 고지합니다.</Text>

        <Title order={4}>제6조 (책임의 제한)</Title>
        <Text size="sm">
          회사는 천재지변, 외부 플랫폼(Meta 등)·AI 제공자의 정책·장애·사용량 한도 등 회사의 통제를 벗어난 사유로 인한
          서비스 중단·발행 실패에 대해 책임을 지지 않습니다. 서비스는 “있는 그대로” 제공됩니다.
        </Text>

        <Title order={4}>제7조 (해지)</Title>
        <Text size="sm">이용자는 언제든지 연동 해제 및 계정 삭제로 이용을 종료할 수 있습니다.</Text>

        <Title order={4}>제8조 (회사 정보·문의)</Title>
        <List size="sm" spacing={2}>
          <List.Item>{COMPANY} (사업자등록번호 {BIZNO})</List.Item>
          <List.Item>대표자: {CEO}</List.Item>
          <List.Item>주소: {ADDR}</List.Item>
          <List.Item>문의: <Anchor href={`mailto:${EMAIL}`}>{EMAIL}</Anchor></List.Item>
        </List>

        <Divider />
        <Text size="xs" c="dimmed">© {COMPANY}</Text>
      </Stack>
    </Container>
  );
}
