import { redirect } from 'next/navigation';
import dayjs from 'dayjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getBalance } from '@/lib/credit';
import { listAccounts } from '@/lib/instagram-account';
import {
    AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Stack, Group, Card, Badge, Button, SimpleGrid, ThemeIcon, Box, Anchor, Paper,
} from '@mantine/core';
import {
    IconBrandInstagram, IconPlus, IconCoin, IconUserPlus, IconPhoto, IconExternalLink,
} from '@tabler/icons-react';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    DRAFT: { label: '초안', color: 'gray' },
    SCHEDULED: { label: '예약됨', color: 'blue' },
    PUBLISHING: { label: '발행 중', color: 'yellow' },
    PUBLISHED: { label: '발행됨', color: 'teal' },
    FAILED: { label: '실패', color: 'red' },
};

export default async function DashboardPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard');

    const [accounts, balance, posts] = await Promise.all([
        listAccounts(userId),
        getBalance(userId),
        prisma.instagramPost.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { account: { select: { username: true } } },
        }),
    ]);

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShellHeader>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'grape', to: 'orange' }} size="lg" radius="md">
                                <IconBrandInstagram size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>InstaAuto</Title>
                            </Anchor>
                        </Group>
                        <Group gap="md">
                            <Badge variant="light" color="grape" size="lg" leftSection={<IconCoin size={14} />}>
                                {balance.toLocaleString()} credits
                            </Badge>
                            <Button component="a" href="/dashboard/accounts" size="xs" variant="subtle" color="grape" leftSection={<IconUserPlus size={14} />}>
                                계정
                            </Button>
                            <Text size="sm" c="dimmed">{session?.user?.email}</Text>
                        </Group>
                    </Group>
                </Container>
            </AppShellHeader>

            <AppShellMain>
                <Container size="xl">
                    <Group justify="space-between" mb="lg">
                        <Stack gap={2}>
                            <Title order={2}>대시보드</Title>
                            <Text c="dimmed" size="sm">연결된 인스타 계정 · 게시물 history</Text>
                        </Stack>
                        <Group>
                            <Button component="a" href="/dashboard/accounts" variant="light" color="grape" leftSection={<IconUserPlus size={16} />}>
                                계정 연결
                            </Button>
                            <Button component="a" href="/dashboard/compose" color="grape" leftSection={<IconPlus size={16} />} disabled={accounts.length === 0}>
                                새 게시물
                            </Button>
                        </Group>
                    </Group>

                    {accounts.length === 0 ? (
                        <Card withBorder p="xl" radius="md" ta="center">
                            <Stack gap="md" align="center" py="md">
                                <ThemeIcon variant="light" color="grape" size={64} radius="xl">
                                    <IconBrandInstagram size={36} />
                                </ThemeIcon>
                                <Stack gap={4}>
                                    <Text fw={700} size="lg">먼저 인스타 계정을 연결하세요 👋</Text>
                                    <Text size="sm" c="dimmed">
                                        Business/Creator 계정 + Facebook Page 연결이 필요합니다.
                                    </Text>
                                </Stack>
                                <Button component="a" href="/dashboard/accounts" leftSection={<IconUserPlus size={16} />} color="grape" size="md">
                                    계정 연결하기
                                </Button>
                            </Stack>
                        </Card>
                    ) : (
                        <Stack gap="lg">
                            {/* 계정 요약 */}
                            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                                {accounts.map((a) => (
                                    <Card key={a.id} withBorder p="md" radius="md">
                                        <Group justify="space-between">
                                            <Group gap="xs">
                                                <ThemeIcon variant="light" color={a.status === 'ACTIVE' ? 'grape' : 'red'} radius="xl">
                                                    <IconBrandInstagram size={18} />
                                                </ThemeIcon>
                                                <Box>
                                                    <Text fw={700} size="sm">@{a.username}</Text>
                                                    <Text size="11px" c="dimmed">
                                                        {a.followers != null ? `${a.followers.toLocaleString()} 팔로워 · ` : ''}{a._count.posts} 게시물
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

                            {/* 게시물 history */}
                            <Box>
                                <Title order={4} mb="sm">게시물</Title>
                                {posts.length === 0 ? (
                                    <Paper withBorder p="lg" radius="md" ta="center">
                                        <Text c="dimmed" size="sm">아직 게시물이 없습니다. “새 게시물”로 시작하세요.</Text>
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
                                                                <Text size="11px" c="dimmed">@{p.account.username}</Text>
                                                                <Text size="11px" c="dimmed">{dayjs(p.createdAt).format('MM-DD HH:mm')}</Text>
                                                            </Group>
                                                            <Text size="sm" lineClamp={1}>{p.caption}</Text>
                                                            {p.error && <Text size="11px" c="red" lineClamp={1}>⚠ {p.error}</Text>}
                                                        </Box>
                                                        {p.permalink && (
                                                            <Button
                                                                component="a"
                                                                href={p.permalink}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                size="xs"
                                                                variant="subtle"
                                                                color="grape"
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
            </AppShellMain>
        </AppShell>
    );
}
