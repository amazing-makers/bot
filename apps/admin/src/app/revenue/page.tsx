import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, Stack, SimpleGrid, Paper, Group, ThemeIcon, Table, Badge, Box,
} from '@mantine/core';
import { IconCash, IconTrendingUp, IconUsers, IconUserOff, IconUsersGroup } from '@tabler/icons-react';
import dayjs from 'dayjs';
import BarChart from '@/components/BarChart';

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
            createdAt: true,
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

// 최근 12개월 시계열 데이터 (신규 구독 + 신규 사용자)
async function getMonthlyTimeSeries() {
    const now = new Date();
    const months: Array<{ label: string; ymKey: string }> = [];
    for (let i = 11; i >= 0; i--) {
        const d = dayjs(now).subtract(i, 'month');
        months.push({ label: d.format('YY/MM'), ymKey: d.format('YYYY-MM') });
    }

    const earliestDate = dayjs(now).subtract(12, 'month').startOf('month').toDate();

    const [newUsers, newSubs] = await Promise.all([
        prisma.user.findMany({
            where: { createdAt: { gte: earliestDate } },
            select: { createdAt: true },
        }),
        prisma.subscription.findMany({
            where: { createdAt: { gte: earliestDate }, plan: { not: 'FREE' } },
            select: { createdAt: true, plan: true },
        }),
    ]);

    const userByMonth = new Map<string, number>();
    const mrrByMonth = new Map<string, number>();
    for (const u of newUsers) {
        const k = dayjs(u.createdAt).format('YYYY-MM');
        userByMonth.set(k, (userByMonth.get(k) ?? 0) + 1);
    }
    for (const s of newSubs) {
        const k = dayjs(s.createdAt).format('YYYY-MM');
        const price = PLAN_PRICE_KRW[s.plan] ?? 0;
        mrrByMonth.set(k, (mrrByMonth.get(k) ?? 0) + price);
    }

    return months.map(m => ({
        label: m.label,
        value: userByMonth.get(m.ymKey) ?? 0,
        secondaryValue: mrrByMonth.get(m.ymKey) ?? 0,
    }));
}

// Phase 31 — 가입 코호트별 잔존율
//   각 가입 월 → 그 월 가입자 중 N개월 후 활성 상태인 비율.
//   "활성" = 캠페인 N개월 내 createdAt OR 구독 active.
async function getCohortRetention() {
    const now = dayjs();
    const months: Array<{ ymKey: string; label: string; startsAt: Date; endsAt: Date }> = [];
    for (let i = 5; i >= 0; i--) {
        const d = now.subtract(i, 'month').startOf('month');
        months.push({
            ymKey: d.format('YYYY-MM'),
            label: d.format('YY/MM'),
            startsAt: d.toDate(),
            endsAt: d.endOf('month').toDate(),
        });
    }

    const earliest = months[0].startsAt;
    const cohortUsers = await prisma.user.findMany({
        where: { createdAt: { gte: earliest } },
        select: {
            id: true,
            createdAt: true,
            subscription: { select: { status: true, plan: true } },
            campaigns: {
                where: { createdAt: { gte: earliest } },
                select: { createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 1,
            },
        },
    });

    return months.map(m => {
        const cohort = cohortUsers.filter(u =>
            u.createdAt >= m.startsAt && u.createdAt <= m.endsAt,
        );
        const total = cohort.length;
        const months1 = m.startsAt;
        const month1End = dayjs(m.startsAt).add(1, 'month').endOf('month').toDate();
        const month3End = dayjs(m.startsAt).add(3, 'month').endOf('month').toDate();

        const active1m = cohort.filter(u => {
            const last = u.campaigns[0]?.createdAt;
            return last && last >= months1 && last <= month1End;
        }).length;
        const active3m = cohort.filter(u => {
            const last = u.campaigns[0]?.createdAt;
            if (last && last >= months1 && last <= month3End) return true;
            return u.subscription?.status === 'active' && u.subscription.plan !== 'FREE';
        }).length;
        const stillPaying = cohort.filter(u =>
            u.subscription?.status === 'active' && u.subscription.plan !== 'FREE',
        ).length;

        return {
            label: m.label,
            total,
            active1m,
            active3m,
            stillPaying,
            retention1m: total > 0 ? Math.round((active1m / total) * 100) : 0,
            retention3m: total > 0 ? Math.round((active3m / total) * 100) : 0,
            payingRate: total > 0 ? Math.round((stillPaying / total) * 100) : 0,
        };
    });
}

// Phase 31 — 처닝 분석: 취소된 구독 + 14일+ 무활동 유료 사용자
async function getChurnStats() {
    const now = new Date();
    const cancelled30d = await prisma.subscription.findMany({
        where: {
            OR: [
                { status: { in: ['cancelled', 'canceled'] } },
                { cancelAtPeriodEnd: true, status: 'active' },
            ],
            updatedAt: { gte: dayjs(now).subtract(30, 'day').toDate() },
        },
        include: {
            user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
    });

    const fourteenDaysAgo = dayjs(now).subtract(14, 'day').toDate();
    const inactivePaidUsers = await prisma.user.findMany({
        where: {
            subscription: {
                status: 'active',
                plan: { not: 'FREE' },
            },
            campaigns: {
                none: { createdAt: { gte: fourteenDaysAgo } },
            },
        },
        select: {
            id: true,
            email: true,
            name: true,
            subscription: { select: { plan: true, currentPeriodEnd: true } },
            campaigns: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { createdAt: true },
            },
        },
        take: 30,
    });

    return { cancelled30d, inactivePaidUsers };
}

export default async function RevenuePage() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email, (session.user as any).role)) redirect('/login');

    const [{ byPlan, totalMrr, subs }, monthlyData, cohorts, churn] = await Promise.all([
        getRevenueStats(),
        getMonthlyTimeSeries(),
        getCohortRetention(),
        getChurnStats(),
    ]);
    const arr = totalMrr * 12;

    return (
        <Stack gap="md">
            <Title order={2}>💰 매출·정산</Title>

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
                    <Group justify="space-between" mb="sm">
                        <Text fw={700}>📈 최근 12개월 추이</Text>
                        <Group gap="xs">
                            <Group gap={4}>
                                <div style={{ width: 10, height: 10, background: 'var(--mantine-color-blue-5)', borderRadius: 2 }} />
                                <Text size="xs" c="dimmed">신규 사용자</Text>
                            </Group>
                            <Group gap={4}>
                                <div style={{ width: 10, height: 10, background: 'var(--mantine-color-violet-5)', borderRadius: 2 }} />
                                <Text size="xs" c="dimmed">신규 MRR (₩)</Text>
                            </Group>
                        </Group>
                    </Group>
                    <BarChart data={monthlyData} height={180} />
                </Paper>

                {/* Phase 31 — 코호트 잔존율 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb="sm">
                        <IconUsersGroup size={18} />
                        <Text fw={700}>📈 가입 코호트 잔존율 (최근 6개월)</Text>
                    </Group>
                    <Text size="xs" c="dimmed" mb="md">
                        각 가입 월의 사용자가 1개월 / 3개월 후 활성 상태인 비율 + 현재 유료 구독 중인 비율
                    </Text>
                    <Table.ScrollContainer minWidth={600}>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>가입 월</Table.Th>
                                    <Table.Th>가입자 수</Table.Th>
                                    <Table.Th>1개월 활성</Table.Th>
                                    <Table.Th>3개월 활성</Table.Th>
                                    <Table.Th>현재 유료</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {cohorts.map(c => (
                                    <Table.Tr key={c.label}>
                                        <Table.Td><Text fw={600}>{c.label}</Text></Table.Td>
                                        <Table.Td><Text size="sm">{c.total}명</Text></Table.Td>
                                        <Table.Td>
                                            <RetentionCell pct={c.retention1m} count={c.active1m} />
                                        </Table.Td>
                                        <Table.Td>
                                            <RetentionCell pct={c.retention3m} count={c.active3m} />
                                        </Table.Td>
                                        <Table.Td>
                                            <RetentionCell pct={c.payingRate} count={c.stillPaying} />
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Paper>

                {/* Phase 31 — 처닝 분석 */}
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                    <Paper withBorder p="md" radius="md">
                        <Group gap={6} mb="sm">
                            <IconUserOff size={18} color="var(--mantine-color-red-6)" />
                            <Text fw={700}>⛔ 최근 30일 처닝</Text>
                            <Badge size="sm" color="red" variant="light">{churn.cancelled30d.length}건</Badge>
                        </Group>
                        {churn.cancelled30d.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="md">처닝 없음 ✨</Text>
                        ) : (
                            <Stack gap="xs">
                                {churn.cancelled30d.slice(0, 10).map(s => (
                                    <Box key={s.id} style={{
                                        padding: 8,
                                        borderLeft: '3px solid var(--mantine-color-red-5)',
                                        background: 'var(--mantine-color-default-hover)',
                                        borderRadius: 4,
                                    }}>
                                        <Group justify="space-between" wrap="nowrap">
                                            <Stack gap={0}>
                                                <Text size="xs" fw={600} truncate>{s.user.email}</Text>
                                                <Text size="11px" c="dimmed">
                                                    {s.plan} · {s.cancelAtPeriodEnd ? '기간 만료 시 취소' : '즉시 취소'}
                                                </Text>
                                            </Stack>
                                            <Text size="11px" c="dimmed">{dayjs(s.updatedAt).format('M.D')}</Text>
                                        </Group>
                                    </Box>
                                ))}
                            </Stack>
                        )}
                    </Paper>

                    <Paper withBorder p="md" radius="md">
                        <Group gap={6} mb="sm">
                            <IconUserOff size={18} color="var(--mantine-color-orange-6)" />
                            <Text fw={700}>⚠️ 14일+ 무활동 유료 사용자</Text>
                            <Badge size="sm" color="orange" variant="light">{churn.inactivePaidUsers.length}명</Badge>
                        </Group>
                        <Text size="11px" c="dimmed" mb="xs">
                            처닝 위험군 — 직접 연락하거나 리마인드 이메일 발송 검토
                        </Text>
                        {churn.inactivePaidUsers.length === 0 ? (
                            <Text size="sm" c="dimmed" ta="center" py="md">전원 활동 중 🎉</Text>
                        ) : (
                            <Stack gap="xs">
                                {churn.inactivePaidUsers.slice(0, 10).map(u => {
                                    const lastActive = u.campaigns[0]?.createdAt;
                                    return (
                                        <Box key={u.id} style={{
                                            padding: 8,
                                            borderLeft: '3px solid var(--mantine-color-orange-5)',
                                            background: 'var(--mantine-color-default-hover)',
                                            borderRadius: 4,
                                        }}>
                                            <Group justify="space-between" wrap="nowrap">
                                                <Stack gap={0}>
                                                    <Text size="xs" fw={600} truncate>{u.email}</Text>
                                                    <Text size="11px" c="dimmed">
                                                        {u.subscription?.plan} · 마지막 활동 {lastActive ? dayjs(lastActive).format('YY-MM-DD') : '없음'}
                                                    </Text>
                                                </Stack>
                                                <Badge size="xs" variant="outline" color="orange">
                                                    {lastActive ? `${dayjs().diff(lastActive, 'day')}일` : '무'}
                                                </Badge>
                                            </Group>
                                        </Box>
                                    );
                                })}
                            </Stack>
                        )}
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
    );
}

function RetentionCell({ pct, count }: { pct: number; count: number }) {
    const color = pct >= 70 ? 'teal' : pct >= 40 ? 'blue' : pct >= 20 ? 'orange' : 'red';
    return (
        <Group gap={6} wrap="nowrap">
            <Box style={{
                background: `var(--mantine-color-${color}-1)`,
                color: `var(--mantine-color-${color}-9)`,
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: 12,
                minWidth: 44,
                textAlign: 'center',
            }}>
                {pct}%
            </Box>
            <Text size="xs" c="dimmed">({count}명)</Text>
        </Group>
    );
}
