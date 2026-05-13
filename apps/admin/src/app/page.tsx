import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, SimpleGrid, Paper, Group, ThemeIcon, Stack, Anchor, Badge, Progress, Box,
} from '@mantine/core';
import {
    IconUsers, IconChartBar, IconRobot, IconCash, IconBolt, IconSpeakerphone,
    IconActivity, IconAlertTriangle, IconClock, IconUserPlus, IconBrush, IconPhoto, IconCoin,
} from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';

async function getStats() {
    const now = new Date();
    const monthStart = dayjs(now).startOf('month').toDate();
    const lastMonthStart = dayjs(monthStart).subtract(1, 'month').toDate();
    const day24hAgo = dayjs(now).subtract(24, 'hour').toDate();
    const dayStart = dayjs(now).startOf('day').toDate();
    const fiveMinAgo = dayjs(now).subtract(5, 'minute').toDate();

    const [
        totalUsers,
        newUsersThisMonth,
        newUsersLastMonth,
        newUsers24h,
        activeSubscriptions,
        totalChannels,
        totalCampaigns,
        runningSeries,
        // Phase 31 — 운영 현황
        todaySuccess,
        todayFailed,
        activeAgents,
        recentErrorTasks,
        // pdpbot + designbot stats
        totalProducts,
        productsThisMonth,
        totalDesigns,
        designsThisMonth,
        totalTemplates,
        // credit stats
        totalCreditBalance,
        creditsUsedThisMonth,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.user.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart } } }),
        prisma.user.count({ where: { createdAt: { gte: day24hAgo } } }),
        prisma.subscription.count({ where: { status: 'active', plan: { not: 'FREE' } } }),
        prisma.marketingChannel.count(),
        prisma.campaign.count(),
        prisma.campaignSeries.count({ where: { status: 'RUNNING' } }),
        prisma.scheduledTask.count({ where: { status: 'SUCCESS', executedAt: { gte: dayStart } } }),
        prisma.scheduledTask.count({ where: { status: 'FAILED', executedAt: { gte: dayStart } } }),
        prisma.agentInstance.count({ where: { lastSeenAt: { gte: fiveMinAgo } } }),
        prisma.scheduledTask.findMany({
            where: { status: 'FAILED', executedAt: { gte: day24hAgo } },
            orderBy: { executedAt: 'desc' },
            take: 5,
            include: {
                campaign: { select: { name: true, user: { select: { email: true } } } },
                channel: { select: { type: true } },
            },
        }),
        // pdpbot
        (prisma as any).product.count().catch(() => 0),
        (prisma as any).product.count({ where: { createdAt: { gte: monthStart } } }).catch(() => 0),
        // designbot
        (prisma as any).design.count().catch(() => 0),
        (prisma as any).design.count({ where: { createdAt: { gte: monthStart } } }).catch(() => 0),
        (prisma as any).designTemplate.count().catch(() => 0),
        // credit
        (prisma as any).userCredit.aggregate({ _sum: { balance: true } }).then((r: any) => r._sum.balance || 0).catch(() => 0),
        (prisma as any).creditTransaction.aggregate({
            where: { delta: { lt: 0 }, createdAt: { gte: monthStart } },
            _sum: { delta: true },
        }).then((r: any) => Math.abs(r._sum.delta || 0)).catch(() => 0),
    ]);

    const todayTotal = todaySuccess + todayFailed;
    const todaySuccessRate = todayTotal > 0 ? Math.round((todaySuccess / todayTotal) * 100) : 0;

    return {
        totalUsers,
        newUsersThisMonth,
        newUsersLastMonth,
        newUsers24h,
        activeSubscriptions,
        totalChannels,
        totalCampaigns,
        runningSeries,
        todaySuccess,
        todayFailed,
        todayTotal,
        todaySuccessRate,
        activeAgents,
        recentErrorTasks,
        totalProducts,
        productsThisMonth,
        totalDesigns,
        designsThisMonth,
        totalTemplates,
        totalCreditBalance,
        creditsUsedThisMonth,
    };
}

function StatCard({ icon: Icon, color, label, value, hint }: {
    icon: any; color: string; label: string; value: string | number; hint?: string;
}) {
    return (
        <Paper withBorder p="lg" radius="md">
            <Group gap="sm" mb="sm">
                <ThemeIcon size={36} radius="md" variant="light" color={color}>
                    <Icon size={20} stroke={1.7} />
                </ThemeIcon>
                <Text size="sm" c="dimmed" fw={600}>{label}</Text>
            </Group>
            <Text size="28px" fw={800}>{value}</Text>
            {hint && <Text size="xs" c="dimmed" mt={4}>{hint}</Text>}
        </Paper>
    );
}

export default async function AdminHome() {
    const session = await auth();
    if (!session?.user) redirect('/login');
    if (!isAdminEmail(session.user.email, (session.user as any).role)) redirect('/login');

    const stats = await getStats();
    const userGrowth = stats.newUsersLastMonth === 0
        ? '신규'
        : `${Math.round(((stats.newUsersThisMonth - stats.newUsersLastMonth) / stats.newUsersLastMonth) * 100)}% MoM`;

    return (
        <Stack gap="xl">
            <Group justify="space-between" align="flex-end">
                <Stack gap={2}>
                    <Title order={2}>🛠 운영 대시보드</Title>
                    <Text c="dimmed" size="sm">전체 플랫폼 핵심 지표 + 운영 현황 + 봇 레지스트리</Text>
                </Stack>
                <Badge size="lg" color="violet" variant="light">SUPER ADMIN</Badge>
            </Group>

            {/* Phase 31 — 운영 현황 (실시간) */}
            <Stack gap={6}>
                <Group justify="space-between">
                    <Title order={3}>⚡ 운영 현황 (실시간)</Title>
                    <Text size="xs" c="dimmed">방금 갱신됨 · 페이지 새로고침으로 업데이트</Text>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                    <Paper withBorder p="lg" radius="md">
                        <Group gap="sm" mb="sm">
                            <ThemeIcon size={36} radius="md" variant="light" color="green"><IconUserPlus size={20} /></ThemeIcon>
                            <Text size="sm" c="dimmed" fw={600}>24시간 신규 가입</Text>
                        </Group>
                        <Text size="28px" fw={800}>{stats.newUsers24h}</Text>
                        <Text size="xs" c="dimmed" mt={4}>이번 달 누적 {stats.newUsersThisMonth}명</Text>
                    </Paper>
                    <Paper withBorder p="lg" radius="md">
                        <Group gap="sm" mb="sm">
                            <ThemeIcon size={36} radius="md" variant="light" color={stats.todaySuccessRate >= 90 ? 'teal' : stats.todaySuccessRate >= 70 ? 'orange' : 'red'}>
                                <IconActivity size={20} />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed" fw={600}>오늘 발행 성공률</Text>
                        </Group>
                        <Text size="28px" fw={800}>{stats.todaySuccessRate}%</Text>
                        <Progress value={stats.todaySuccessRate} size="xs" mt={6} color={stats.todaySuccessRate >= 90 ? 'teal' : stats.todaySuccessRate >= 70 ? 'orange' : 'red'} />
                        <Text size="xs" c="dimmed" mt={4}>✓ {stats.todaySuccess} / ✗ {stats.todayFailed} (총 {stats.todayTotal}건)</Text>
                    </Paper>
                    <Paper withBorder p="lg" radius="md">
                        <Group gap="sm" mb="sm">
                            <ThemeIcon size={36} radius="md" variant="light" color={stats.activeAgents > 0 ? 'teal' : 'gray'}>
                                <IconRobot size={20} />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed" fw={600}>활성 에이전트</Text>
                        </Group>
                        <Text size="28px" fw={800}>{stats.activeAgents}</Text>
                        <Text size="xs" c="dimmed" mt={4}>5분 내 heartbeat</Text>
                    </Paper>
                    <Paper withBorder p="lg" radius="md">
                        <Group gap="sm" mb="sm">
                            <ThemeIcon size={36} radius="md" variant="light" color={stats.recentErrorTasks.length > 5 ? 'red' : stats.recentErrorTasks.length > 0 ? 'orange' : 'gray'}>
                                <IconAlertTriangle size={20} />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed" fw={600}>24시간 오류 발행</Text>
                        </Group>
                        <Text size="28px" fw={800}>{stats.recentErrorTasks.length}+</Text>
                        <Text size="xs" c="dimmed" mt={4}>최근 5건만 표시</Text>
                    </Paper>
                </SimpleGrid>

                {/* 최근 오류 task 5건 */}
                {stats.recentErrorTasks.length > 0 && (
                    <Paper withBorder p="md" radius="md" mt="xs">
                        <Group gap={6} mb="sm">
                            <IconAlertTriangle size={16} color="var(--mantine-color-red-6)" />
                            <Text fw={700} size="sm">최근 발행 실패 (24시간)</Text>
                        </Group>
                        <Stack gap={4}>
                            {stats.recentErrorTasks.map(t => (
                                <Box key={t.id} style={{
                                    padding: 8,
                                    borderLeft: '3px solid var(--mantine-color-red-6)',
                                    background: 'var(--mantine-color-default-hover)',
                                    borderRadius: 4,
                                }}>
                                    <Group justify="space-between" wrap="nowrap" gap="md">
                                        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                            <Group gap={6} wrap="nowrap">
                                                <Badge size="xs" variant="outline" color="gray">{t.channel.type}</Badge>
                                                <Text size="xs" fw={600} truncate>{t.campaign.name}</Text>
                                            </Group>
                                            <Text size="11px" c="red.7" lineClamp={1}>
                                                {t.errorLog?.slice(0, 200) || '오류 로그 없음'}
                                            </Text>
                                            <Text size="10px" c="dimmed">{t.campaign.user.email}</Text>
                                        </Stack>
                                        <Group gap={3}>
                                            <IconClock size={11} color="var(--mantine-color-dimmed)" />
                                            <Text size="11px" c="dimmed">{t.executedAt ? dayjs(t.executedAt).format('HH:mm') : '-'}</Text>
                                        </Group>
                                    </Group>
                                </Box>
                            ))}
                        </Stack>
                    </Paper>
                )}
            </Stack>

            <Stack gap={6}>
                <Title order={3}>📊 핵심 지표</Title>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                        <StatCard
                            icon={IconUsers}
                            color="blue"
                            label="전체 사용자"
                            value={stats.totalUsers.toLocaleString()}
                            hint={`이번 달 신규 ${stats.newUsersThisMonth}명 (${userGrowth})`}
                        />
                        <StatCard
                            icon={IconCash}
                            color="teal"
                            label="유료 구독"
                            value={stats.activeSubscriptions.toLocaleString()}
                            hint={stats.totalUsers > 0 ? `전체의 ${((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}%` : ''}
                        />
                        <StatCard
                            icon={IconSpeakerphone}
                            color="violet"
                            label="발행된 캠페인"
                            value={stats.totalCampaigns.toLocaleString()}
                            hint={`연결된 채널 ${stats.totalChannels}개`}
                        />
                        <StatCard
                            icon={IconBolt}
                            color="orange"
                            label="자동 발행 진행 중"
                            value={stats.runningSeries.toLocaleString()}
                            hint="RUNNING 상태 시리즈"
                        />
                    </SimpleGrid>
                </Stack>

                {/* pdpbot + designbot 사용 현황 */}
                <Stack gap={6}>
                    <Title order={3}>🤖 봇 사용 현황</Title>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                        <StatCard
                            icon={IconPhoto}
                            color="violet"
                            label="pdpbot 처리 상품"
                            value={stats.totalProducts.toLocaleString()}
                            hint={`이번 달 +${stats.productsThisMonth}개`}
                        />
                        <StatCard
                            icon={IconBrush}
                            color="pink"
                            label="designbot 디자인"
                            value={stats.totalDesigns.toLocaleString()}
                            hint={`이번 달 +${stats.designsThisMonth}개 · 템플릿 ${stats.totalTemplates}개`}
                        />
                        <StatCard
                            icon={IconCoin}
                            color="orange"
                            label="이번 달 credits 사용"
                            value={stats.creditsUsedThisMonth.toLocaleString()}
                            hint={`잔여 잔액 합계 ${stats.totalCreditBalance.toLocaleString()} cr`}
                        />
                    </SimpleGrid>
                </Stack>

                <Stack gap={6}>
                    <Title order={3}>🤖 봇 레지스트리</Title>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                        <BotCard
                            kind="marketing"
                            title="마케팅봇"
                            desc="SNS·블로그 자동 발행, AI 캡션·이미지 생성"
                            domain="marketingbot.amakers.co.kr"
                            status="LIVE"
                            users={stats.totalUsers}
                        />
                        <BotCard
                            kind="pdp"
                            title="상세페이지봇"
                            desc="타오바오/쿠팡 상품 → 한국어 광고 이미지 자동 생성"
                            domain="pdpbot.amakers.co.kr"
                            status="BETA"
                            users={stats.totalProducts}
                        />
                        <BotCard
                            kind="design"
                            title="디자인봇"
                            desc="AI 광고 디자인 + Konva 캔버스 에디터 + 브랜드 키트"
                            domain="designbot.amakers.co.kr"
                            status="BETA"
                            users={stats.totalDesigns}
                        />
                        <BotCard
                            kind="mockup"
                            title="목업봇"
                            desc="상품 이미지 → 티셔츠·머그·포스터 목업 AI 생성"
                            domain="mockupbot.amakers.co.kr"
                            status="PLANNED"
                            users={0}
                        />
                    </SimpleGrid>
                </Stack>

            <Stack gap={6}>
                <Title order={3}>🔧 빠른 작업</Title>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                    <QuickLink href="/users" icon={IconUsers} label="사용자 관리" />
                    <QuickLink href="/resellers" icon={IconChartBar} label="리셀러 관리" />
                    <QuickLink href="/revenue" icon={IconCash} label="매출·정산" />
                    <QuickLink href="/bots" icon={IconRobot} label="봇 설정" />
                </SimpleGrid>
            </Stack>
        </Stack>
    );
}

function BotCard({ title, desc, domain, status, users }: {
    kind: string; title: string; desc: string; domain: string; status: 'LIVE' | 'PLANNED' | 'BETA'; users: number;
}) {
    const color = status === 'LIVE' ? 'teal' : status === 'BETA' ? 'orange' : 'gray';
    return (
        <Paper withBorder p="md" radius="md">
            <Group gap="sm" justify="space-between" mb={4}>
                <Text fw={700}>{title}</Text>
                <Badge color={color} variant="light" size="sm">{status}</Badge>
            </Group>
            <Text size="xs" c="dimmed" mb="sm">{desc}</Text>
            <Group gap={4} mb={4}>
                <Text size="11px" c="dimmed">🌐</Text>
                <Text size="11px" c="dimmed">{domain}</Text>
            </Group>
            <Text size="11px" c="dimmed">사용자 {users.toLocaleString()}명</Text>
        </Paper>
    );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    return (
        <Anchor href={href} underline="never">
            <Paper withBorder p="md" radius="md" style={{ cursor: 'pointer' }}>
                <Group gap="sm">
                    <ThemeIcon size={32} radius="md" variant="light"><Icon size={16} /></ThemeIcon>
                    <Text fw={600} size="sm">{label}</Text>
                </Group>
            </Paper>
        </Anchor>
    );
}
