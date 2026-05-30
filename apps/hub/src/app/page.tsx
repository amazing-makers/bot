import { redirect } from 'next/navigation';
import {
  Container, Group, Title, Text, Badge, Button, Stack, ThemeIcon, Divider,
} from '@mantine/core';
import { IconBolt, IconCoins, IconArrowRight } from '@tabler/icons-react';
import { auth } from '@/auth';
import { getBalance } from '@amakers/billing';
import { ToolGrid } from '@/components/ToolGrid';
import { SignOutButton } from '@/components/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function HubDashboard() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = (session.user as any).id as string;
  const balance = await getBalance(userId);
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
            color="yellow"
            leftSection={<IconCoins size={15} />}
            component="a"
            href="/billing"
            style={{ cursor: 'pointer' }}
          >
            {balance.toLocaleString()} 크레딧
          </Badge>
          <SignOutButton />
        </Group>
      </Group>

      {/* 인사 */}
      <Stack gap={4} mb="lg">
        <Title order={2}>안녕하세요, {displayName}님 👋</Title>
        <Text c="dimmed">사용할 자동화 도구를 선택하세요. 모든 도구는 하나의 크레딧 잔액을 공유합니다.</Text>
      </Stack>

      <Group mb="lg">
        <Button
          component="a"
          href="/billing"
          variant="light"
          color="yellow"
          rightSection={<IconArrowRight size={16} />}
        >
          크레딧 충전 / 내역
        </Button>
      </Group>

      <Divider mb="lg" label="자동화 도구" labelPosition="left" />

      <ToolGrid />
    </Container>
  );
}
