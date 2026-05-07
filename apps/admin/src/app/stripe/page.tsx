import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, Stack, Paper, Group, Badge, SimpleGrid, ThemeIcon, Anchor, Table, Box,
} from '@mantine/core';
import { IconCreditCard, IconAlertTriangle, IconRefresh, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import dayjs from 'dayjs';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Stripe 결제 모니터링 · Amakers Admin' };

const STATUS_COLOR: Record<string, string> = {
    active: 'teal',
    trialing: 'blue',
    past_due: 'red',
    canceled: 'gray',
    cancelled: 'gray',
    unpaid: 'orange',
    incomplete: 'orange',
    incomplete_expired: 'red',
};

interface PageProps {
    searchParams: Promise<{ status?: string; plan?: string }>;
}

export default async function StripePage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email, (session.user as any).role)) redirect('/login');

    const sp = await searchParams;
    const where: any = {};
    if (sp.status) where.status = sp.status;
    if (sp.plan) where.plan = sp.plan;

    const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();

    const [subs, recentChanges, byStatus, recentlyCancelled, pastDue] = await Promise.all([
        // 필터 적용된 목록
        prisma.subscription.findMany({
            where,
            include: { user: { select: { id: true, email: true, name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 100,
        }),
        // 최근 7일 변경
        prisma.subscription.findMany({
            where: { updatedAt: { gte: sevenDaysAgo } },
            include: { user: { select: { email: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 30,
        }),
        // 상태별 카운트
        prisma.subscription.groupBy({
            by: ['status'],
            _count: { _all: true },
        }),
        // 30일 내 취소
        prisma.subscription.count({
            where: {
                OR: [
                    { status: { in: ['canceled', 'cancelled'] } },
                    { cancelAtPeriodEnd: true, status: 'active' },
                ],
                updatedAt: { gte: thirtyDaysAgo },
            },
        }),
        // 결제 실패 (past_due)
        prisma.subscription.count({
            where: { status: 'past_due' },
        }),
    ]);

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Group gap={6}>
                    <IconCreditCard size={24} />
                    <Title order={2}>💳 Stripe 결제 모니터링</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Stripe 웹훅으로 동기화된 구독 상태. 결제 실패·취소·트라이얼 종료를 한눈에 파악합니다.
                </Text>
            </Stack>

            {/* 핵심 지표 */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb={4}>
                        <ThemeIcon size={28} radius="md" variant="light" color="teal"><IconCreditCard size={16} /></ThemeIcon>
                        <Text size="xs" c="dimmed" fw={600}>활성 구독</Text>
                    </Group>
                    <Text fw={800} size="20px">
                        {byStatus.find((b: any) => b.status === 'active')?._count?._all || 0}
                    </Text>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb={4}>
                        <ThemeIcon size={28} radius="md" variant="light" color="red"><IconAlertTriangle size={16} /></ThemeIcon>
                        <Text size="xs" c="dimmed" fw={600}>결제 실패</Text>
                    </Group>
                    <Text fw={800} size="20px" c={pastDue > 0 ? 'red.7' : undefined}>
                        {pastDue}
                    </Text>
                    <Text size="11px" c="dimmed" mt={2}>past_due 상태</Text>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb={4}>
                        <ThemeIcon size={28} radius="md" variant="light" color="orange"><IconTrendingDown size={16} /></ThemeIcon>
                        <Text size="xs" c="dimmed" fw={600}>30일 취소</Text>
                    </Group>
                    <Text fw={800} size="20px">{recentlyCancelled}</Text>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb={4}>
                        <ThemeIcon size={28} radius="md" variant="light" color="blue"><IconRefresh size={16} /></ThemeIcon>
                        <Text size="xs" c="dimmed" fw={600}>7일 변경</Text>
                    </Group>
                    <Text fw={800} size="20px">{recentChanges.length}</Text>
                </Paper>
            </SimpleGrid>

            {/* 결제 실패 사용자 (긴급) */}
            {pastDue > 0 && (
                <Paper withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-red-3)', background: 'var(--mantine-color-red-0)' }}>
                    <Group gap={6} mb="sm">
                        <IconAlertTriangle size={18} color="var(--mantine-color-red-6)" />
                        <Text fw={700} c="red.8">🚨 결제 실패 처리 필요 ({pastDue}명)</Text>
                    </Group>
                    <Stack gap={4}>
                        {subs.filter(s => s.status === 'past_due').slice(0, 5).map(s => (
                            <Group key={s.id} justify="space-between" wrap="nowrap">
                                <Anchor href={`/users/${s.user.id}`} size="sm" fw={600}>
                                    {s.user.email}
                                </Anchor>
                                <Group gap={6}>
                                    <Badge size="xs" variant="light">{s.plan}</Badge>
                                    <Text size="11px" c="dimmed">{dayjs(s.updatedAt).format('M.D HH:mm')}</Text>
                                </Group>
                            </Group>
                        ))}
                    </Stack>
                </Paper>
            )}

            {/* 상태 분포 */}
            <Paper withBorder p="md" radius="md">
                <Text fw={700} size="sm" mb="sm">상태 분포</Text>
                <Group gap="xs">
                    <Anchor href="/stripe">
                        <Badge size="md" variant={!sp.status ? 'filled' : 'light'} color="gray">
                            전체 {byStatus.reduce((sum, b) => sum + b._count._all, 0)}
                        </Badge>
                    </Anchor>
                    {byStatus.map(b => (
                        <Anchor key={b.status} href={`/stripe?status=${b.status}`}>
                            <Badge
                                size="md"
                                variant={sp.status === b.status ? 'filled' : 'light'}
                                color={STATUS_COLOR[b.status] || 'gray'}
                            >
                                {b.status} {b._count._all}
                            </Badge>
                        </Anchor>
                    ))}
                </Group>
            </Paper>

            {/* 최근 변경 타임라인 */}
            <Paper withBorder p="md" radius="md">
                <Group gap={6} mb="sm">
                    <IconTrendingUp size={18} />
                    <Text fw={700}>최근 7일 구독 변경 ({recentChanges.length}건)</Text>
                </Group>
                {recentChanges.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">최근 7일 변경 없음</Text>
                ) : (
                    <Stack gap="xs">
                        {recentChanges.slice(0, 20).map(s => {
                            const color = STATUS_COLOR[s.status] || 'gray';
                            const cancelling = s.cancelAtPeriodEnd && s.status === 'active';
                            return (
                                <Box key={s.id} style={{
                                    padding: 10,
                                    borderLeft: `3px solid var(--mantine-color-${cancelling ? 'orange' : color}-6)`,
                                    background: 'var(--mantine-color-default-hover)',
                                    borderRadius: 6,
                                }}>
                                    <Group justify="space-between" wrap="nowrap">
                                        <Stack gap={0}>
                                            <Group gap={6}>
                                                <Anchor href={`/users/${s.userId}`} size="sm" fw={600}>
                                                    {s.user.email}
                                                </Anchor>
                                                <Badge size="xs" variant="light">{s.plan}</Badge>
                                                <Badge size="xs" color={color} variant="light">{s.status}</Badge>
                                                {cancelling && <Badge size="xs" color="orange" variant="filled">기간 만료 시 취소</Badge>}
                                            </Group>
                                            {s.currentPeriodEnd && (
                                                <Text size="11px" c="dimmed">
                                                    다음 결제: {dayjs(s.currentPeriodEnd).format('YYYY-MM-DD')}
                                                </Text>
                                            )}
                                        </Stack>
                                        <Text size="11px" c="dimmed">{dayjs(s.updatedAt).format('M.D HH:mm')}</Text>
                                    </Group>
                                </Box>
                            );
                        })}
                    </Stack>
                )}
            </Paper>

            {/* 전체 구독 (필터 적용) */}
            <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="sm">
                    <Text fw={700} size="sm">
                        구독 목록 ({subs.length}건{(sp.status || sp.plan) ? ' · 필터 적용' : ''})
                    </Text>
                    {(sp.status || sp.plan) && (
                        <Anchor href="/stripe" size="xs" c="red">필터 초기화</Anchor>
                    )}
                </Group>
                <Table.ScrollContainer minWidth={680}>
                    <Table striped>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>이메일</Table.Th>
                                <Table.Th>플랜</Table.Th>
                                <Table.Th>상태</Table.Th>
                                <Table.Th>다음 결제</Table.Th>
                                <Table.Th>변경일</Table.Th>
                                <Table.Th>Stripe ID</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {subs.map(s => (
                                <Table.Tr key={s.id}>
                                    <Table.Td>
                                        <Anchor href={`/users/${s.userId}`} size="sm">
                                            {s.user.email}
                                        </Anchor>
                                    </Table.Td>
                                    <Table.Td>
                                        <Anchor href={`/stripe?plan=${s.plan}`} size="xs">
                                            <Badge size="sm" variant="light">{s.plan}</Badge>
                                        </Anchor>
                                    </Table.Td>
                                    <Table.Td>
                                        <Badge size="sm" color={STATUS_COLOR[s.status] || 'gray'} variant="light">
                                            {s.status}
                                        </Badge>
                                        {s.cancelAtPeriodEnd && s.status === 'active' && (
                                            <Badge size="xs" color="orange" variant="light" ml={4}>취소 예정</Badge>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs">{s.currentPeriodEnd ? dayjs(s.currentPeriodEnd).format('YY-MM-DD') : '-'}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs" c="dimmed">{dayjs(s.updatedAt).format('YY-MM-DD HH:mm')}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        {s.stripeCustomerId ? (
                                            <Anchor
                                                href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                size="xs"
                                            >
                                                {s.stripeCustomerId.slice(0, 14)}...↗
                                            </Anchor>
                                        ) : (
                                            <Text size="xs" c="dimmed">-</Text>
                                        )}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Paper>
        </Stack>
    );
}
