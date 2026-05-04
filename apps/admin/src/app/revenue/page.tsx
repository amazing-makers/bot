import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Container, Title, Text, Stack, SimpleGrid, Paper, Group, ThemeIcon, Anchor, Table, Badge,
} from '@mantine/core';
import { IconCash, IconTrendingUp, IconUsers } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

// 플랜별 월 가격 (원). 추후 packages/billing 으로 이동 권장.
const PLAN_PRICE_KRW: Record<string, number> = {
    FREE: 0,
    STARTER: 9900,
    PRO: 29900,
    BUSINESS: 99000,
};

async function getRevenueStats() {
    const subs = await prisma.subscription.findMany({
        where: { status: 'active' },
        select: {
            plan: true,
            stripeCustomerId: true,
            currentPeriodEnd: true,
            user: { select: { email: true, name: true, createdAt: true } },
        },
    });

    const byPlan: Record<string, { count: number; mrr: number }> = {};
    let totalMrr = 0;
    for (const s of subs) {
        const plan = s.plan || 'FREE';
        if (!byPlan[plan]) byPlan[plan] = { count: 0, mrr: 0 };
        byPlan[plan].count++;
        const price = PLAN_PRICE_KRW[plan] || 0;
        byPlan[plan].mrr += price;
        totalMrr += price;
    }
    return { byPlan, totalMrr, subs };
}

export default async function RevenuePage() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) redirect('/login');

    const { byPlan, totalMrr, subs } = await getRevenueStats();
    const arr = totalMrr * 12;

    return (
        <Container size="xl" py="xl">
            <Stack gap="md">
                <Stack gap={2}>
                    <Anchor component={Link} href="/" size="sm">← 대시보드</Anchor>
                    <Title order={2}>💰 매출·정산</Title>
                </Stack>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Paper withBorder p="lg" radius="md">
                        <Group gap="sm" mb="sm">
                            <ThemeIcon size={36} radius="md" variant="light" color="teal"><IconCash size={20} /></ThemeIcon>
                            <Text size="sm" c="dimmed" fw={600}>MRR (월 반복 매출)</Text>
                        </Group>
                        <Text size="28px" fw={800}>₩{totalMrr.toLocaleString()}</Text>
                    </Paper>
                    <Paper withBorder p="lg" radius="md">
                        <Group gap="sm" mb="sm">
                            <ThemeIcon size={36} radius="md" variant="light" color="blue"><IconTrendingUp size={20} /></ThemeIcon>
                            <Text size="sm" c="dimmed" fw={600}>ARR (연 환산)</Text>
                        </Group>
                        <Text size="28px" fw={800}>₩{arr.toLocaleString()}</Text>
                    </Paper>
                    <Paper withBorder p="lg" radius="md">
                        <Group gap="sm" mb="sm">
                            <ThemeIcon size={36} radius="md" variant="light" color="violet"><IconUsers size={20} /></ThemeIcon>
                            <Text size="sm" c="dimmed" fw={600}>유료 사용자</Text>
                        </Group>
                        <Text size="28px" fw={800}>{subs.filter(s => s.plan !== 'FREE').length.toLocaleString()}</Text>
                    </Paper>
                </SimpleGrid>

                <Paper withBorder p="md" radius="md">
                    <Text fw={700} mb="sm">📊 플랜별 분포</Text>
                    <Table>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>플랜</Table.Th>
                                <Table.Th>월 가격</Table.Th>
                                <Table.Th>구독자 수</Table.Th>
                                <Table.Th>MRR</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {Object.entries(byPlan)
                                .sort((a, b) => (PLAN_PRICE_KRW[b[0]] || 0) - (PLAN_PRICE_KRW[a[0]] || 0))
                                .map(([plan, info]) => (
                                    <Table.Tr key={plan}>
                                        <Table.Td><Badge variant="light">{plan}</Badge></Table.Td>
                                        <Table.Td>₩{(PLAN_PRICE_KRW[plan] || 0).toLocaleString()}</Table.Td>
                                        <Table.Td>{info.count}명</Table.Td>
                                        <Table.Td><Text fw={600}>₩{info.mrr.toLocaleString()}</Text></Table.Td>
                                    </Table.Tr>
                                ))}
                        </Table.Tbody>
                    </Table>
                </Paper>

                <Paper withBorder p="md" radius="md">
                    <Text fw={700} mb="sm">🏷 최근 활성 구독 ({subs.length}건)</Text>
                    <Table striped>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>이메일</Table.Th>
                                <Table.Th>플랜</Table.Th>
                                <Table.Th>다음 결제일</Table.Th>
                                <Table.Th>월 가격</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {subs.slice(0, 50).map((s, i) => (
                                <Table.Tr key={i}>
                                    <Table.Td><Text size="sm">{s.user?.email || '-'}</Text></Table.Td>
                                    <Table.Td><Badge variant="light" size="sm">{s.plan}</Badge></Table.Td>
                                    <Table.Td><Text size="xs">{s.currentPeriodEnd ? dayjs(s.currentPeriodEnd).format('YYYY-MM-DD') : '-'}</Text></Table.Td>
                                    <Table.Td><Text size="sm">₩{(PLAN_PRICE_KRW[s.plan] || 0).toLocaleString()}</Text></Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Paper>
            </Stack>
        </Container>
    );
}
