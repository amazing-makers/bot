import { redirect } from 'next/navigation';
import { Container, Group, Title, Text, Button, Stack, Alert } from '@mantine/core';
import { IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import { auth } from '@/auth';
import { listUserApiKeys, AI_PROVIDERS, PROVIDER_META } from '@amakers/ai';
import { KeysManager, type ProviderInfo } from '@/components/KeysManager';

export const dynamic = 'force-dynamic';

export default async function KeysPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = (session.user as any).id as string;
  const keys = await listUserApiKeys(userId);
  const byProvider = new Map(keys.map((k) => [k.provider, k]));

  const providers: ProviderInfo[] = AI_PROVIDERS.map((p) => {
    const meta = PROVIDER_META[p];
    const row = byProvider.get(p);
    return {
      provider: p,
      label: meta.label,
      issueUrl: meta.issueUrl,
      hint: meta.hint,
      connected: Boolean(row),
      maskedHint: row?.maskedHint,
    };
  });

  return (
    <Container size="sm" py="xl">
      <Group mb="lg">
        <Button component="a" href="/" variant="subtle" color="gray" size="xs" leftSection={<IconArrowLeft size={16} />}>
          허브로
        </Button>
      </Group>

      <Stack gap={4} mb="lg">
        <Title order={2}>AI 키 연결 (BYOK)</Title>
        <Text c="dimmed">
          내 무료 AI 키를 한 번 등록하면 인스타·블로그 등 <b>모든 도구</b>에서 AI 캡션·글 생성이 동작합니다.
        </Text>
      </Stack>

      <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />} mb="lg">
        키는 암호화되어 저장되며, 발행·기본 기능은 모두 무료입니다. AI만 내 키로 사용해요.
      </Alert>

      <KeysManager providers={providers} />
    </Container>
  );
}
