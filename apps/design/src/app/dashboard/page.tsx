import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getBalance } from '@/lib/credit';
import {
    AppShell, Container, Title, Text, Stack, Group, Card, Badge, Button, SimpleGrid, ThemeIcon,
    Box, Image, Anchor, Paper,
} from '@mantine/core';
import { IconBrush, IconPlus, IconCoin, IconClock, IconPalette } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { CANVAS_PRESETS } from '@/lib/design/types';
import NewDesignButtons from '@/components/dashboard/NewDesignButtons';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard');

    const [designs, balance] = await Promise.all([
        (prisma as any).design.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            take: 50,
            select: {
                id: true, title: true, canvasWidth: true, canvasHeight: true,
                thumbnailUrl: true, templateKey: true, updatedAt: true,
            },
        }),
        getBalance(userId),
    ]);

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
                            <Group gap="xs">
                                <ThemeIcon variant="gradient" gradient={{ from: 'pink', to: 'orange' }} size="lg" radius="md">
                                    <IconBrush size={20} />
                                </ThemeIcon>
                                <Title order={3}>designbot</Title>
                            </Group>
                        </Anchor>
                        <Group gap="md">
                            <Badge variant="light" color="violet" size="lg" leftSection={<IconCoin size={14} />}>
                                {balance.toLocaleString()} credits
                            </Badge>
                            <Button component={Link} href="/dashboard/brand" size="xs" variant="subtle" color="violet" leftSection={<IconPalette size={14} />}>
                                브랜드 키트
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
                            <Title order={2}>내 디자인</Title>
                            <Text size="sm" c="dimmed">셀러용 광고·SNS·배너 디자인을 빠르게.</Text>
                        </Stack>
                    </Group>

                    {/* 신규 디자인 시작 */}
                    <Paper withBorder p="md" radius="md" mb="lg">
                        <Text size="sm" fw={700} mb="xs">새 디자인 시작</Text>
                        <NewDesignButtons presets={CANVAS_PRESETS} />
                    </Paper>

                    {/* 디자인 갤러리 */}
                    {designs.length === 0 ? (
                        <Card withBorder p="xl" radius="md" ta="center">
                            <Stack gap="md" align="center" py="xl">
                                <ThemeIcon variant="light" color="pink" size={64} radius="xl">
                                    <IconBrush size={36} />
                                </ThemeIcon>
                                <Stack gap={4}>
                                    <Text fw={700} size="lg">첫 디자인을 시작해보세요 🎨</Text>
                                    <Text size="sm" c="dimmed">
                                        위에서 사이즈 (인스타·쿠팡 등) 선택 → 캔버스 에디터 진입.
                                    </Text>
                                </Stack>
                            </Stack>
                        </Card>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }}>
                            {designs.map((d: any) => (
                                <Card key={d.id} withBorder p="sm" radius="md" component={Link} href={`/editor/${d.id}`} style={{ cursor: 'pointer' }}>
                                    {d.thumbnailUrl ? (
                                        <Image src={d.thumbnailUrl} radius="sm" fit="contain" h={160} alt={d.title || ''} />
                                    ) : (
                                        <Box h={160} bg="gray.1" style={{ borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <IconClock size={28} color="var(--mantine-color-gray-5)" />
                                        </Box>
                                    )}
                                    <Stack gap={4} mt="sm">
                                        <Text fw={600} size="sm" lineClamp={1}>{d.title || '(제목 없음)'}</Text>
                                        <Group gap={4}>
                                            <Badge size="xs" variant="light">{d.canvasWidth}×{d.canvasHeight}</Badge>
                                            {d.templateKey && d.templateKey !== 'custom' && (
                                                <Badge size="xs" variant="dot" color="pink">템플릿</Badge>
                                            )}
                                        </Group>
                                        <Text size="11px" c="dimmed">
                                            {dayjs(d.updatedAt).format('YYYY-MM-DD HH:mm')}
                                        </Text>
                                    </Stack>
                                </Card>
                            ))}
                        </SimpleGrid>
                    )}
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
