import { redirect } from 'next/navigation';
import { Container, Group, Title, Text, Button, ThemeIcon } from '@mantine/core';
import { IconArrowLeft, IconSend } from '@tabler/icons-react';
import { auth } from '@/auth';
import { prisma } from '@amakers/db';
import { hasAnyApiKey } from '@amakers/ai';
import { MultiComposeForm } from '@/components/MultiComposeForm';

export const dynamic = 'force-dynamic';

export default async function ComposePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = (session.user as any).id as string;

  const [insta, blogs, tistory, hasAiKey] = await Promise.all([
    prisma.instagramAccount.findMany({ where: { userId, status: 'ACTIVE' }, select: { id: true, username: true } }),
    prisma.blogAccount.findMany({ where: { userId, status: 'ACTIVE' }, select: { id: true, siteUrl: true } }),
    prisma.tistoryAccount.findMany({ where: { userId, status: 'ACTIVE' }, select: { id: true, siteUrl: true } }),
    hasAnyApiKey(userId),
  ]);

  const channels = {
    instagram: insta.map((a) => ({ value: a.id, label: `@${a.username}` })),
    blog: blogs.map((a) => ({ value: a.id, label: a.siteUrl.replace(/^https?:\/\//, '') })),
    tistory: tistory.map((a) => ({ value: a.id, label: a.siteUrl })),
  };

  return (
    <Container size="xl" py="xl">
      <Group mb="lg">
        <Button component="a" href="/" variant="subtle" color="gray" size="xs" leftSection={<IconArrowLeft size={16} />}>
          허브로
        </Button>
      </Group>

      <Group gap="xs" mb={4}>
        <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'grape' }} size={32} radius="md">
          <IconSend size={18} />
        </ThemeIcon>
        <Title order={2}>한 번에 다채널 발행</Title>
      </Group>
      <Text c="dimmed" mb="lg">
        제목·본문·이미지를 한 번 작성하면 선택한 <b>인스타그램·블로그·티스토리</b>에 동시 발행됩니다. (인스타는 캡션 자동 변환)
      </Text>

      <MultiComposeForm channels={channels} hasAiKey={hasAiKey} />
    </Container>
  );
}
