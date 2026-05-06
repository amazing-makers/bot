import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, Stack, Group, Paper, Badge, Anchor, SimpleGrid, ThemeIcon, Card, Table, Box,
} from '@mantine/core';
import {
    IconUser, IconCash, IconSpeakerphone, IconBolt, IconWorld,
    IconCalendar, IconCoin,
} from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import AdminActionsPanel from './AdminActionsPanel';
import ActivityHeatmap from './ActivityHeatmap';
import EngagementScore from './EngagementScore';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

const PLAN_PRICE_KRW: Record<string, number> = {
    FREE: 0,
    STARTER: 9900,
    PRO: 29900,
    BUSINESS: 99000,
};

export default async function UserDetailPage({ params }: PageProps) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) redirect('/login');

    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            subscription: true,
            channels: { orderBy: { createdAt: 'desc' } },
            campaigns: { orderBy: { createdAt: 'desc' }, take: 20 },
            series: { orderBy: { createdAt: 'desc' } },
            referredByCode: {
                include: { reseller: { select: { id: true, name: true } } },
            },
            reseller: {
                include: {
                    referralCodes: { include: { _count: { select: { referrals: true } } } },
                    _count: { select: { commissions: true } },
                },
            },
        },
    });

    if (!user) notFound();

    // Phase 36 — 활동 히트맵: 최근 90일 캠페인 createdAt 기반 24×7 매트릭스
    const ninetyDaysAgo = dayjs().subtract(90, 'day').toDate();
    const activityRecords = await prisma.campaign.findMany({
        where: { userId: id, createdAt: { gte: ninetyDaysAgo } },
        select: { createdAt: true },
    });
    const heatmapMatrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let peakDay = 0, peakHour = 0, peakCount = 0;
    for (const r of activityRecords) {
        const d = r.createdAt;
        const day = d.getDay();
        const hour = d.getHours();
        heatmapMatrix[day][hour]++;
        if (heatmapMatrix[day][hour] > peakCount) {
            peakCount = heatmapMatrix[day][hour];
            peakDay = day;
            peakHour = hour;
        }
    }
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    const peak = peakCount > 0 ? { day: dayLabels[peakDay], hour: peakHour, count: peakCount } : null;

    // Phase 48 — Engagement Score 계산
    const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();
    const [lastCampaign, lastWeekCount, lastMonthCount, taskStats] = await Promise.all([
        prisma.campaign.findFirst({
            where: { userId: id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        }),
        prisma.campaign.count({ where: { userId: id, createdAt: { gte: sevenDaysAgo } } }),
        prisma.campaign.findMany({
            where: { userId: id, createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true },
        }),
        prisma.scheduledTask.groupBy({
            by: ['status'],
            where: { campaign: { userId: id }, executedAt: { gte: thirtyDaysAgo } },
            _count: { _all: true },
        }),
    ]);

    const recencyDays = lastCampaign
        ? Math.floor(dayjs().diff(lastCampaign.createdAt, 'day'))
        : 999;
    const frequencyPerWeek = lastWeekCount;
    const uniqueDays = new Set(lastMonthCount.map(c => dayjs(c.createdAt).format('YYYY-MM-DD')));
    const consistencyDays = uniqueDays.size;
    const totalTasks = taskStats.reduce((s, g) => s + g._count._all, 0);
    const successTasks = taskStats.find(g => g.status === 'SUCCESS')?._count?._all || 0;
    const successRate = totalTasks > 0 ? Math.round((successTasks / totalTasks) * 100) : 0;

    // 점수 계산 (각 0-100, 가중평균)
    const recencyScore = Math.max(0, 100 - recencyDays * 3);
    const frequencyScore = Math.min(100, frequencyPerWeek * 20);
    const consistencyScore = Math.round((consistencyDays / 30) * 100);
    const engagementScore = Math.round(
        recencyScore * 0.35 + frequencyScore * 0.25 + consistencyScore * 0.25 + successRate * 0.15
    );
    const engagementLabel: 'cold' | 'warm' | 'hot' | 'champion' =
        engagementScore >= 75 ? 'champion' :
        engagementScore >= 50 ? 'hot' :
        engagementScore >= 25 ? 'warm' : 'cold';

    const plan = user.subscription?.plan ?? 'FREE';
    const monthlyKrw = PLAN_PRICE_KRW[plan] ?? 0;
    const planColor = plan === 'BUSINESS' ? 'violet' : plan === 'PRO' ? 'blue' : plan === 'STARTER' ? 'teal' : 'gray';

    const isReseller = !!user.reseller;
    const wasReferred = !!user.referredByCode;

    return (
        <Stack gap="md">
            {/* 헤더 */}
            <Stack gap={2}>
                <Anchor component={Link} href="/users" size="sm">← 사용자 목록</Anchor>
                <Group gap="sm" align="center">
                        <ThemeIcon size={48} radius="xl" variant="light" color="blue"><IconUser size={28} /></ThemeIcon>
                        <Stack gap={0}>
                            <Title order={2}>{user.name || user.email}</Title>
                            <Group gap={6}>
                                <Text size="sm" c="dimmed">{user.email}</Text>
                                <Badge size="sm" color={planColor} variant="light">{plan}</Badge>
                                {isReseller && <Badge size="sm" color="violet" variant="light">🤝 리셀러</Badge>}
                                {wasReferred && (
                                    <Badge size="sm" color="cyan" variant="light">
                                        🎁 추천: {user.referredByCode?.reseller.name}
                                    </Badge>
                                )}
                            </Group>
                        </Stack>
                    </Group>
                </Stack>

                {/* Phase 31 — 관리자 액션 패널 */}
                <AdminActionsPanel
                    userId={user.id}
                    userEmail={user.email}
                    stripeCustomerId={user.subscription?.stripeCustomerId || null}
                    hasActiveSub={!!user.subscription && user.subscription.status === 'active'}
                />

                {/* Phase 48 — Engagement Score */}
                <EngagementScore
                    score={engagementScore}
                    label={engagementLabel}
                    factors={{
                        recencyDays,
                        frequencyPerWeek,
                        consistencyDays,
                        successRate,
                    }}
                />

                {/* Phase 36 — 활동 히트맵 (최근 90일 캠페인 작성) */}
                <ActivityHeatmap
                    matrix={heatmapMatrix}
                    totalEvents={activityRecords.length}
                    peak={peak}
                />

                {/* 핵심 지표 */}
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                    <StatCard icon={IconCalendar} color="gray" label="가입일" value={dayjs(user.createdAt).format('YYYY-MM-DD')} hint={`${dayjs().diff(user.createdAt, 'day')}일 전`} />
                    <StatCard icon={IconCash} color="teal" label="월 결제액" value={`₩${monthlyKrw.toLocaleString()}`} hint={user.subscription?.status || '구독 없음'} />
                    <StatCard icon={IconWorld} color="blue" label="연결 채널" value={`${user.channels.length}개`} />
                    <StatCard icon={IconSpeakerphone} color="violet" label="총 캠페인" value={`${user.campaigns.length}건`} hint={`시리즈 ${user.series.length}개`} />
                </SimpleGrid>

                {/* 구독 정보 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb="sm"><IconCash size={18} /><Text fw={700}>구독 정보</Text></Group>
                    {user.subscription ? (
                        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                            <Field label="플랜" value={<Badge color={planColor} variant="light">{plan}</Badge>} />
                            <Field label="상태" value={user.subscription.status} />
                            <Field label="다음 결제일" value={user.subscription.currentPeriodEnd ? dayjs(user.subscription.currentPeriodEnd).format('YYYY-MM-DD') : '-'} />
                            <Field label="Stripe ID" value={user.subscription.stripeCustomerId ? `${user.subscription.stripeCustomerId.slice(0, 12)}...` : '-'} />
                        </SimpleGrid>
                    ) : (
                        <Text size="sm" c="dimmed">구독 정보 없음 (FREE)</Text>
                    )}
                </Paper>

                {/* 추천 정보 */}
                {(wasReferred || isReseller) && (
                    <Paper withBorder p="md" radius="md">
                        <Group gap={6} mb="sm"><IconCoin size={18} /><Text fw={700}>추천·리셀러</Text></Group>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            {wasReferred && (
                                <Card withBorder p="sm" radius="md">
                                    <Text size="xs" c="dimmed" mb={4}>추천 받음</Text>
                                    <Group gap={6}>
                                        <Badge color="cyan" variant="light">{user.referredByCode?.code}</Badge>
                                        <Anchor component={Link} href={`/resellers/${user.referredByCode?.reseller.id}`} size="sm" fw={600}>
                                            {user.referredByCode?.reseller.name}
                                        </Anchor>
                                    </Group>
                                </Card>
                            )}
                            {isReseller && user.reseller && (
                                <Card withBorder p="sm" radius="md">
                                    <Text size="xs" c="dimmed" mb={4}>본인이 리셀러</Text>
                                    <Group gap={6}>
                                        <Anchor component={Link} href={`/resellers/${user.reseller.id}`} size="sm" fw={600}>
                                            {user.reseller.name}
                                        </Anchor>
                                        <Badge size="sm" variant="light">코드 {user.reseller.referralCodes.length}개</Badge>
                                        <Badge size="sm" variant="light" color="teal">{(user.reseller.commissionRate * 100).toFixed(0)}% 수수료</Badge>
                                    </Group>
                                </Card>
                            )}
                        </SimpleGrid>
                    </Paper>
                )}

                {/* 채널 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb="sm"><IconWorld size={18} /><Text fw={700}>연결된 채널 ({user.channels.length})</Text></Group>
                    {user.channels.length === 0 ? (
                        <Text size="sm" c="dimmed">아직 연결된 채널이 없습니다.</Text>
                    ) : (
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>타입</Table.Th>
                                    <Table.Th>계정명</Table.Th>
                                    <Table.Th>지역</Table.Th>
                                    <Table.Th>상태</Table.Th>
                                    <Table.Th>등록일</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {user.channels.slice(0, 20).map(c => (
                                    <Table.Tr key={c.id}>
                                        <Table.Td><Badge size="xs" variant="light">{c.type}</Badge></Table.Td>
                                        <Table.Td><Text size="sm">{c.accountName}</Text></Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{c.region || '-'}</Text></Table.Td>
                                        <Table.Td>
                                            <Badge size="xs" color={c.status === 'ACTIVE' ? 'teal' : c.status === 'ERROR' ? 'red' : 'gray'} variant="light">
                                                {c.status}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{dayjs(c.createdAt).format('YY-MM-DD')}</Text></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Paper>

                {/* 최근 캠페인 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb="sm"><IconSpeakerphone size={18} /><Text fw={700}>최근 캠페인 ({user.campaigns.length})</Text></Group>
                    {user.campaigns.length === 0 ? (
                        <Text size="sm" c="dimmed">아직 캠페인이 없습니다.</Text>
                    ) : (
                        <Table striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>이름</Table.Th>
                                    <Table.Th>상태</Table.Th>
                                    <Table.Th>생성일</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {user.campaigns.slice(0, 10).map(c => (
                                    <Table.Tr key={c.id}>
                                        <Table.Td><Text size="sm">{c.name}</Text></Table.Td>
                                        <Table.Td><Badge size="xs" variant="light">{c.status}</Badge></Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{dayjs(c.createdAt).format('YY-MM-DD HH:mm')}</Text></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </Paper>

                {/* 시리즈 */}
                {user.series.length > 0 && (
                    <Paper withBorder p="md" radius="md">
                        <Group gap={6} mb="sm"><IconBolt size={18} /><Text fw={700}>자동 발행 시리즈 ({user.series.length})</Text></Group>
                        <Table striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>이름</Table.Th>
                                    <Table.Th>상태</Table.Th>
                                    <Table.Th>진행</Table.Th>
                                    <Table.Th>생성일</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {user.series.map(s => (
                                    <Table.Tr key={s.id}>
                                        <Table.Td><Text size="sm">{s.name}</Text></Table.Td>
                                        <Table.Td>
                                            <Badge size="xs" color={s.status === 'RUNNING' ? 'teal' : s.status === 'PAUSED' ? 'orange' : s.status === 'COMPLETED' ? 'blue' : 'gray'} variant="light">
                                                {s.status}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td><Text size="xs">{s.completedPosts} / {s.totalPosts}</Text></Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{dayjs(s.createdAt).format('YY-MM-DD')}</Text></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Paper>
            )}
        </Stack>
    );
}

function StatCard({ icon: Icon, color, label, value, hint }: {
    icon: any; color: string; label: string; value: string; hint?: string;
}) {
    return (
        <Paper withBorder p="md" radius="md">
            <Group gap={6} mb={4}>
                <ThemeIcon size={28} radius="md" variant="light" color={color}><Icon size={16} /></ThemeIcon>
                <Text size="xs" c="dimmed" fw={600}>{label}</Text>
            </Group>
            <Text fw={800} size="20px">{value}</Text>
            {hint && <Text size="11px" c="dimmed" mt={2}>{hint}</Text>}
        </Paper>
    );
}

function Field({ label, value }: { label: string; value: any }) {
    return (
        <Box>
            <Text size="xs" c="dimmed">{label}</Text>
            <Box mt={2}>{typeof value === 'string' ? <Text fw={600} size="sm">{value}</Text> : value}</Box>
        </Box>
    );
}
