import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button } from '@mantine/core';
import { IconArticle, IconArrowLeft, IconPlus } from '@tabler/icons-react';
import { CalendarClient, type CalendarPost } from '@/components/CalendarClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/calendar');

    const posts = await prisma.blogPost.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: { id: true, title: true, status: true, scheduledAt: true, publishedAt: true, createdAt: true },
    });

    const calendarPosts: CalendarPost[] = posts.map((p) => ({
        id: p.id,
        caption: p.title,
        status: p.status,
        when: (p.scheduledAt ?? p.publishedAt ?? p.createdAt).toISOString(),
    }));

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShellHeader>
                <Container size="lg" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="lg" radius="md">
                                <IconArticle size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>BlogAuto</Title>
                            </Anchor>
                        </Group>
                        <Group gap="xs">
                            <Button component="a" href="/dashboard/compose" size="xs" color="blue" leftSection={<IconPlus size={14} />}>새 글</Button>
                            <Button component="a" href="/dashboard" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14} />}>대시보드</Button>
                        </Group>
                    </Group>
                </Container>
            </AppShellHeader>

            <AppShellMain>
                <Container size="lg">
                    <Title order={2} mb={4}>콘텐츠 달력</Title>
                    <Text c="dimmed" size="sm" mb="lg">예약·발행 글을 한눈에. 날짜를 클릭하면 그 날짜로 새 글을 예약합니다.</Text>
                    <CalendarClient posts={calendarPosts} />
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
