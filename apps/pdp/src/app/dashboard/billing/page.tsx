import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getBalance } from '@/lib/credit';
import {
    AppShell, Container, Title, Text, Stack, Group, Card, Badge, Button, ThemeIcon, Box, Paper, Table, Anchor,
} from '@mantine/core';
import { IconWand, IconCoin, IconArrowLeft, IconShoppingCart } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    OCR:        { label: 'OCR 분석',        color: 'blue' },
    INPAINT:    { label: '인페인팅',         color: 'pink' },
    TRANSLATE:  { label: '번역',             color: 'cyan' },
    COMPOSE:    { label: '합성',             color: 'gray' },
    IMAGE_GEN:  { label: '이미지 생성',      color: 'violet' },
    PUBLISH:    { label: '발행 (마케팅봇)',  color: 'green' },
    PURCHASE:   { label: '충전',             color: 'teal' },
    REFUND:     { label: '환불',             color: 'orange' },
};

const BOT_LABELS: Record<string, string> = {
    pdpbot: '상세페이지봇',
    marketingbot: '마케팅봇',
    designbot: '디자인봇',
    adminbot: '어드민봇',
};

export default async function BillingPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/billing');

    const [balance, transactions] = await Promise.all([
        getBalance(userId),
        prisma.creditTransaction.findMany({
            where: { userCredit: { userId } },
            orderBy: { createdAt: 'desc' },
            take: 100,
        }),
    ]);

    const purchased = transactions.filter(t => t.delta > 0).reduce((s, t) => s + t.delta, 0);
    const used = transactions.filter(t => t.delta < 0).reduce((s, t) => s + Math.abs(t.delta), 0);

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
                                <Group gap="xs">
                                    <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size="lg" radius="md">
                                        <IconWand size={20} />
                                    </ThemeIcon>
                                    <Title order={3}>pdpbot</Title>
                                </Group>
                            </Anchor>
                        </Group>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="lg">
                    <Group justify="space-between" mb="md">
                        <Group gap="xs">
                            <Button component={Link} href="/dashboard" variant="subtle" size="sm" leftSection={<IconArrowLeft size={14} />}>
                                대시보드
                            </Button>
                            <Title order={3}>credits 사용 내역</Title>
                        </Group>
                        <Button component={Link} href="/pricing" color="violet" leftSection={<IconShoppingCart size={16} />}>
                            credits 충전
                        </Button>
                    </Group>

                    {/* 요약 */}
                    <Paper withBorder p="lg" radius="md" mb="lg">
                        <Group gap="xl">
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>현재 잔액</Text>
                                <Text fw={900} size="32px" c="violet.7">
                                    <IconCoin size={24} style={{ verticalAlign: 'middle' }} /> {balance.toLocaleString()}
                                </Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>총 충전</Text>
                                <Text fw={700} size="xl" c="teal.7">+{purchased.toLocaleString()}</Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>총 사용</Text>
                                <Text fw={700} size="xl" c="red.7">-{used.toLocaleString()}</Text>
                            </Box>
                        </Group>
                    </Paper>

                    {/* 거래 내역 */}
                    {transactions.length === 0 ? (
                        <Card withBorder p="xl" ta="center">
                            <Text c="dimmed" mb="md">아직 거래 내역이 없습니다.</Text>
                            <Button component={Link} href="/pricing" color="violet">첫 충전</Button>
                        </Card>
                    ) : (
                        <Card withBorder p={0} radius="md">
                            <Table verticalSpacing="sm" highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>일시</Table.Th>
                                        <Table.Th>작업</Table.Th>
                                        <Table.Th>봇</Table.Th>
                                        <Table.Th ta="right">변동</Table.Th>
                                        <Table.Th ta="right">잔액</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {transactions.map((t) => {
                                        const meta = ACTION_LABELS[t.action] || { label: t.action, color: 'gray' };
                                        return (
                                            <Table.Tr key={t.id}>
                                                <Table.Td>
                                                    <Text size="xs">{dayjs(t.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge variant="light" color={meta.color}>{meta.label}</Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Text size="xs" c="dimmed">{BOT_LABELS[t.bot || ''] || t.bot}</Text>
                                                </Table.Td>
                                                <Table.Td ta="right">
                                                    <Text fw={700} c={t.delta > 0 ? 'teal.7' : 'red.7'}>
                                                        {t.delta > 0 ? '+' : ''}{t.delta.toLocaleString()}
                                                    </Text>
                                                </Table.Td>
                                                <Table.Td ta="right">
                                                    <Text size="sm">{t.balanceAfter.toLocaleString()}</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        );
                                    })}
                                </Table.Tbody>
                            </Table>
                        </Card>
                    )}
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
