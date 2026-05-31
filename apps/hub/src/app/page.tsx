import { redirect } from 'next/navigation';
import {
  Container, Group, Title, Text, Badge, Button, Stack, ThemeIcon, Divider,
} from '@mantine/core';
import { IconBolt, IconKey, IconArrowRight } from '@tabler/icons-react';
import { auth } from '@/auth';
import { prisma } from '@amakers/db';
import { ToolGrid } from '@/components/ToolGrid';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function HubDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = (session.user as any).id as string;
  const keyCount = await prisma.userApiKey.count({ where: { userId } });
  const hasKey = keyCount > 0;
  const displayName = session.user.name || session.user.email || '사용자';

  return (
    <Container size="lg" py="xl">
      {/* 헤더 */}
      <Group justify="space-between" align="center" mb="xl">
        <Group gap="xs">
          <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'grape' }} size={36} radius="md">
            <IconBolt size={22} />
          </ThemeIcon>
          <Title order={3}>Amakers 허브</Title>
        </Group>
        <Group gap="sm">
          <Badge
            size="lg"
            variant="light"
            color={hasKey ? 'teal' : 'gray'}
            leftSection={<IconKey size={15} />}
            component="a"
            href="/keys"
            style={{ cursor: 'pointer' }}
          >
            {hasKey ? 'AI 키 연결됨' : 'AI 키 연결'}
          </Badge>
          <SignOutButton />
        </Group>
      </Group>

      {/* 인사 */}
      <Stack gap={4} mb="lg">
        <Title order={2}>안녕하세요, {displayName}님 👋</Title>
        <Text c="dimmed">사용할 자동화 도구를 선택하세요. 모든 도구는 기본 무료이며, AI는 내 API 키로 동작합니다.</Text>
      </Stack>

      {!hasKey && (
        <Group mb="lg">
          <Button
            component="a"
            href="/keys"
            variant="light"
            rightSection={<IconArrowRight size={16} />}
          >
            AI 키 연결하기 (무료) — 한 번 등록하면 모든 도구에서 AI 사용
          </Button>
        </Group>
      )}

      <Divider mb="lg" label="자동화 도구" labelPosition="left" />

      <ToolGrid />
    </Container>
  );
}
