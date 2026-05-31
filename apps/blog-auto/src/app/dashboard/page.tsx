import { redirect } from 'next/navigation';
import dayjs from 'dayjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { listAccounts } from '@/lib/blog-account';
import { PostActions } from '@/components/PostActions';
import {
    AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Stack, Group, Card, Badge, Button, SimpleGrid, ThemeIcon, Box, Anchor, Paper, Alert,
} from '@mantine/core';
import { IconArticle, IconPlus, IconKey, IconWorldWww, IconExternalLink, IconCalendarEvent, IconAlertTriangle } from '@tabler/icons-react';

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

    const [accounts, posts] = await Promise.all([
        listAccounts(userId),
        prisma.blogPost.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { account: { select: { siteUrl: true, provider: true } } },
        }),
    ]);

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShellHeader>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="lg" radius="md">
                                <IconArticle size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>NaverBlogAuto</Title>
                            </Anchor>
                        </Group>
                        <Group gap="md">
                            <Button component="a" href="/dashboard/calendar" size="xs" variant="subtle" color="blue" leftSection={<IconCalendarEvent size={14} />}>
                                달력
                            </Button>
                            <Button component="a" href="/dashboard/settings/ai" size="xs" variant="subtle" color="blue" leftSection={<IconKey size={14} />}>
                                AI키
                            </Button>
                            <Button component="a" href="/dashboard/accounts" size="xs" variant="subtle" color="blue" leftSection={<IconWorldWww size={14} />}>
                                블로그 연결
                            </Button>
                            <Text size="sm" c="dimmed">{session?.user?.email}</Text>
                        </Group>
                    </Group>
                </Container>
            </AppShellHeader>

            <AppShellMain>
                <Container size="xl">
                    {accounts.some((a) => a.status !== 'ACTIVE') && (
                        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />} mb="lg" title="블로그 재연결이 필요합니다">
                            <Group justify="space-between" align="center">
                                <Text size="sm">일부 블로그의 인증이 만료/무효 상태입니다. 재연결 전까지 해당 블로그는 발행이 실패합니다.</Text>
                                <Button component="a" href="/dashboard/accounts" size="xs" color="red" variant="filled">재연결하기</Button>
                            </Group>
                        </Alert>
                    )}
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
                                                        <Group gap="xs" wrap="nowrap">
                                                            <PostActions postId={p.id} status={p.status} />
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
