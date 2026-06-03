import { redirect } from 'next/navigation';
import { Container, Group, Title, Text, Button, ThemeIcon, Stack, SimpleGrid, Paper } from '@mantine/core';
import { IconRobot, IconArrowLeft } from '@tabler/icons-react';
import { auth } from '@/auth';
import { prisma } from '@amakers/db';
import { listAutomations, getStats } from '@/app/actions/automations';
import { AutomationsManager } from '@/components/AutomationsManager';
import { DesktopConnect } from '@/components/DesktopConnect';
import { getOrCreateDesktopToken } from '@/lib/agent-token';

export const dynamic = 'force-dynamic';

export default async function AutomationsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = (session.user as any).id as string;

  const [insta, blog, tistory, items, desktopToken, pendingDrops, stats] = await Promise.all([
    prisma.instagramAccount.findMany({ where: { userId }, select: { id: true, username: true } }),
    prisma.blogAccount.findMany({ where: { userId }, select: { id: true, username: true, siteUrl: true } }),
    prisma.tistoryAccount.findMany({ where: { userId }, select: { id: true, username: true, siteUrl: true } }),
    listAutomations(),
    getOrCreateDesktopToken(userId),
    prisma.agentDropItem.count({ where: { userId, status: 'PENDING' } }),
    getStats(),
  ]);

  const statCards = [
    { label: '활성 자동화', value: stats.activeAutomations, color: 'grape' },
    { label: '성공 실행', value: stats.runSuccess, color: 'teal' },
    { label: '실패 실행', value: stats.runFailed, color: 'red' },
    { label: '발행 글(전체)', value: stats.posts.instagram + stats.posts.blog + stats.posts.tistory, color: 'blue' },
  ];

  const accounts = {
    instagram: insta.map((a) => ({ id: a.id, label: '@' + a.username })),
    blog: blog.map((a) => ({ id: a.id, label: `${a.username} (${a.siteUrl})` })),
    tistory: tistory.map((a) => ({ id: a.id, label: `${a.username} (${a.siteUrl})` })),
  };

  return (
    <Container size="md" py="xl">
      <Button component="a" href="/" variant="subtle" color="gray" size="xs" leftSection={<IconArrowLeft size={16} />} mb="md">
        허브로
      </Button>
      <Group gap="xs" mb="xs">
        <ThemeIcon variant="light" color="grape" size={36} radius="md"><IconRobot size={22} /></ThemeIcon>
        <div>
          <Title order={3}>자동화</Title>
          <Text c="dimmed" size="sm">정해둔 주기마다 알아서 글·이미지를 만들어 발행합니다. AI 비서에게 말로 시켜도 만들어져요.</Text>
        </div>
      </Group>
      <SimpleGrid cols={{ base: 2, sm: 4 }} mt="lg" spacing="sm">
        {statCards.map((s) => (
          <Paper key={s.label} withBorder radius="md" p="md">
            <Text size="xs" c="dimmed">{s.label}</Text>
            <Text fw={700} size="xl" c={`${s.color}.6`}>{s.value}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      <Stack mt="lg">
        <DesktopConnect initialToken={desktopToken} pending={pendingDrops} />
        <AutomationsManager accounts={accounts} initial={items} />
      </Stack>
    </Container>
  );
}
