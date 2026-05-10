import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getBalance } from '@/lib/credit';
import {
    AppShell, Container, Title, Text, Stack, Group, Card, Badge, Button, SimpleGrid, ThemeIcon, Box,
    Image, Anchor, Paper,
} from '@mantine/core';
import { IconWand, IconPlus, IconCoin, IconClock, IconCheck, IconExternalLink, IconKey } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard');

    const [products, balance] = await Promise.all([
        prisma.product.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
            include: {
                _count: { select: { images: true, outputImages: true } },
                outputImages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: { r2Url: true },
                },
            },
        }),
        getBalance(userId),
    ]);

    const sourceLabels: Record<string, string> = {
        coupang: '쿠팡', naver: '네이버', taobao: '타오바오', '1688': '1688',
        amazon: '아마존', generic: '기타',
    };

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size="lg" radius="md">
                                <IconWand size={20} />
                            </ThemeIcon>
                            <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>pdpbot</Title>
                            </Anchor>
                        </Group>
                        <Group gap="md">
                            <Anchor component={Link} href="/dashboard/billing" underline="never">
                                <Badge variant="light" color="violet" size="lg" leftSection={<IconCoin size={14} />}>
                                    {balance.toLocaleString()} credits
                                </Badge>
                            </Anchor>
                            <Button component={Link} href="/pricing" size="xs" variant="light" color="violet">
                                충전
                            </Button>
                            <Button component={Link} href="/dashboard/api-keys" size="xs" variant="subtle" color="teal" leftSection={<IconKey size={14} />}>
                                BYOK
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
                            <Text c="dimmed" size="sm">처리한 상품 history + 새 상품 시작</Text>
                        </Stack>
                        <Button component={Link} href="/" leftSection={<IconPlus size={16} />} color="violet">
                            새 상품 처리
                        </Button>
                    </Group>

                    {/* 잔액 / 사용량 안내 */}
                    {balance < 50 && (
                        <Paper withBorder p="md" radius="md" mb="md" bg="orange.0">
                            <Group gap="xs">
                                <IconCoin size={20} color="var(--mantine-color-orange-6)" />
                                <Box>
                                    <Text fw={700} size="sm">credits 부족 ({balance})</Text>
                                    <Text size="xs" c="dimmed">
                                        이미지 1장 처리 ≈ 41 credits. 추가 충전이 필요합니다.
                                        (개발 중: <code>npm run seed:credits -- 1000</code>)
                                    </Text>
                                </Box>
                            </Group>
                        </Paper>
                    )}

                    {/* History */}
                    {products.length === 0 ? (
                        <Card withBorder p="xl" radius="md" ta="center">
                            <Stack gap="md" align="center" py="xl">
                                <ThemeIcon variant="light" color="violet" size={64} radius="xl">
                                    <IconWand size={36} />
                                </ThemeIcon>
                                <Stack gap={4}>
                                    <Text fw={700} size="lg">아직 처리한 상품이 없어요</Text>
                                    <Text size="sm" c="dimmed">
                                        쿠팡·타오바오 URL 1개로 첫 상세페이지를 만들어보세요.
                                    </Text>
                                </Stack>
                                <Button component={Link} href="/" leftSection={<IconPlus size={16} />} color="violet" size="md">
                                    첫 상품 시작
                                </Button>
                            </Stack>
                        </Card>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                            {products.map((p) => {
                                const thumb = p.outputImages[0]?.r2Url;
                                return (
                                    <Card key={p.id} withBorder p="md" radius="md">
                                        {thumb ? (
                                            <Image src={thumb} radius="sm" fit="cover" h={160} alt={p.title || ''} />
                                        ) : (
                                            <Box h={160} bg="gray.1" style={{ borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <IconClock size={28} color="var(--mantine-color-gray-5)" />
                                            </Box>
                                        )}
                                        <Stack gap={4} mt="sm">
                                            <Group gap={4}>
                                                <Badge size="xs" variant="light">{sourceLabels[p.source] || p.source}</Badge>
                                                <Badge size="xs" variant="light" color="teal">
                                                    {p._count.outputImages}/{p._count.images} 처리됨
                                                </Badge>
                                            </Group>
                                            <Text fw={600} size="sm" lineClamp={2}>
                                                {p.title || '(제목 없음)'}
                                            </Text>
                                            <Text size="11px" c="dimmed">
                                                {dayjs(p.createdAt).format('YYYY-MM-DD HH:mm')}
                                            </Text>
                                            <Group gap="xs" mt="xs">
                                                <Button
                                                    component={Link}
                                                    href={`/product/${p.id}`}
                                                    size="xs"
                                                    variant="light"
                                                    leftSection={<IconCheck size={12} />}
                                                >
                                                    상세
                                                </Button>
                                                {p.sourceUrl && (
                                                    <Button
                                                        component="a"
                                                        href={p.sourceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        size="xs"
                                                        variant="subtle"
                                                        color="gray"
                                                        leftSection={<IconExternalLink size={12} />}
                                                    >
                                                        원본
                                                    </Button>
                                                )}
                                            </Group>
                                        </Stack>
                                    </Card>
                                );
                            })}
                        </SimpleGrid>
                    )}
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
