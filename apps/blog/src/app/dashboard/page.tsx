import { redirect } from 'next/navigation';
import dayjs from 'dayjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getBalance } from '@/lib/credit';
import { listAccounts } from '@/lib/blog-account';
import {
    AppShell, Container, Title, Text, Stack, Group, Card, Badge, Button, SimpleGrid, ThemeIcon, Box, Anchor, Paper,
} from '@mantine/core';
import { IconArticle, IconPlus, IconCoin, IconWorldWww, IconExternalLink } from '@tabler/icons-react';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    DRAFT: { label: '초안', color: 'gray' },
    SCHEDULED: { label: '예약됨', color: 'blue' },
    PUBLISHING: { label: '발행 중', color: 'yellow' },
    PUBLISHED: { label: '발행됨', color: 'teal' },
    FAILED: { label: '실패', color: 'red' },
};

const PROVIDER_LABEL: Record<string, string> = { WORDPRESS: 'WordPress', NAVER: '네이버블로그' };

export default async function DashboardPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard');

    const [accounts, balance, posts] = await Promise.all([
        listAccounts(userId),
        getBalance(userId),
        prisma.blogPost.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { account: { select: { siteUrl: true, provider: true } } },
        }),
    ]);

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="lg" radius="md">
                                <IconArticle size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>blogbot</Title>
                            </Anchor>
                        </Group>
                        <Group gap="md">
                            <Badge variant="light" color="blue" size="lg" leftSection={<IconCoin size={14} />}>
                                {balance.toLocaleString()} credits
                            </Badge>
                            <Button component="a" href="/dashboard/accounts" size="xs" variant="subtle" color="blue" leftSection={<IconWorldWww size={14} />}>
                                블로그 연결
                            </Button>
                            <Text size="sm" c="dimmed">{session?.user?.email}</Text>
                        </Group>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="xl">
                    <Group justify="space-between" mb="lg">
                        <Stack gap={2}>
                            <Title order={2}>대시보드</Title>
                            <Text c="dimmed" size="sm">연결된 블로그 · 게시글 history</Text>
                        </Stack>
                        <Group>
                            <Button component="a" href="/dashboard/accounts" variant="light" color="blue" leftSection={<IconWorldWww size={16} />}>
                                블로그 연결
                            </Button>
                            <Button component="a" href="/dashboard/compose" color="blue" leftSection={<IconPlus size={16} />} disabled={accounts.length === 0}>
                                새 글 작성
                            </Button>
                        </Group>
                    </Group>

                    {accounts.length === 0 ? (
                        <Card withBorder p="xl" radius="md" ta="center">
                            <Stack gap="md" align="center" py="md">
                                <ThemeIcon variant="light" color="blue" size={64} radius="xl">
                                    <IconArticle size={36} />
                                </ThemeIcon>
                                <Stack gap={4}>
                                    <Text fw={700} size="lg">먼저 블로그를 연결하세요 👋</Text>
                                    <Text size="sm" c="dimmed">
                                        WordPress 사이트 + Application Password 로 연결합니다. (네이버블로그는 준비 중)
                                    </Text>
                                </Stack>
                                <Button component="a" href="/dashboard/accounts" leftSection={<IconWorldWww size={16} />} color="blue" size="md">
                                    블로그 연결하기
                                </Button>
                            </Stack>
                        </Card>
                    ) : (
                        <Stack gap="lg">
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                                {accounts.map((a) => (
                                    <Card key={a.id} withBorder p="md" radius="md">
                                        <Group justify="space-between">
                                            <Group gap="xs">
                                                <ThemeIcon variant="light" color={a.status === 'ACTIVE' ? 'blue' : 'red'} radius="xl">
                                                    <IconWorldWww size={18} />
                                                </ThemeIcon>
                                                <Box style={{ minWidth: 0 }}>
                                                    <Text fw={700} size="sm" lineClamp={1}>{a.siteUrl.replace(/^https?:\/\//, '')}</Text>
                                                    <Text size="11px" c="dimmed">
                                                        {PROVIDER_LABEL[a.provider] || a.provider} · @{a.username} · {a._count.posts} 글
                                                    </Text>
                                                </Box>
                                            </Group>
                                            <Badge size="xs" variant="light" color={a.status === 'ACTIVE' ? 'teal' : 'red'}>
                                                {a.status === 'ACTIVE' ? '연결됨' : '재연결 필요'}
                                            </Badge>
                                        </Group>
                                    </Card>
                                ))}
                            </SimpleGrid>

                            <Box>
                                <Title order={4} mb="sm">게시글</Title>
                                {posts.length === 0 ? (
                                    <Paper withBorder p="lg" radius="md" ta="center">
                                        <Text c="dimmed" size="sm">아직 게시글이 없습니다. “새 글 작성”으로 시작하세요.</Text>
                                    </Paper>
                                ) : (
                                    <Stack gap="xs">
                                        {posts.map((p) => {
                                            const st = STATUS_LABEL[p.status] ?? { label: p.status, color: 'gray' };
                                            return (
                                                <Paper key={p.id} withBorder p="sm" radius="md">
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Box style={{ minWidth: 0 }}>
                                                            <Group gap="xs" mb={2}>
                                                                <Badge size="xs" variant="light" color={st.color}>{st.label}</Badge>
                                                                <Text size="11px" c="dimmed" lineClamp={1}>
                                                                    {p.account.siteUrl.replace(/^https?:\/\//, '')}
                                                                </Text>
                                                                <Text size="11px" c="dimmed">{dayjs(p.createdAt).format('MM-DD HH:mm')}</Text>
                                                            </Group>
                                                            <Text size="sm" fw={600} lineClamp={1}>{p.title}</Text>
                                                            {p.error && <Text size="11px" c="red" lineClamp={1}>⚠ {p.error}</Text>}
                                                        </Box>
                                                        {p.link && (
                                                            <Button
                                                                component="a"
                                                                href={p.link}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                size="xs"
                                                                variant="subtle"
                                                                color="blue"
                                                                leftSection={<IconExternalLink size={12} />}
                                                            >
                                                                보기
                                                            </Button>
                                                        )}
                                                    </Group>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        </Stack>
                    )}
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
