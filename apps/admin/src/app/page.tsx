import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Container, Title, Text, SimpleGrid, Paper, Group, ThemeIcon, Stack, Anchor, Badge,
} from '@mantine/core';
import { IconUsers, IconChartBar, IconRobot, IconCash, IconBolt, IconSpeakerphone } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';

async function getStats() {
    const now = new Date();
    const monthStart = dayjs(now).startOf('month').toDate();
    const lastMonthStart = dayjs(monthStart).subtract(1, 'month').toDate();

    const [
        totalUsers,
        newUsersThisMonth,
        newUsersLastMonth,
        activeSubscriptions,
        totalChannels,
        totalCampaigns,
        runningSeries,
    ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
        prisma.user.count({ where: { createdAt: { gte: lastMonthStart, lt: monthStart } } }),
        prisma.subscription.count({ where: { status: 'active', plan: { not: 'FREE' } } }),
        prisma.marketingChannel.count(),
        prisma.campaign.count(),
        prisma.campaignSeries.count({ where: { status: 'RUNNING' } }),
    ]);

    return {
        totalUsers,
        newUsersThisMonth,
        newUsersLastMonth,
        activeSubscriptions,
        totalChannels,
        totalCampaigns,
        runningSeries,
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
    if (!isAdminEmail(session.user.email)) redirect('/login');

    const stats = await getStats();
    const userGrowth = stats.newUsersLastMonth === 0
        ? '신규'
        : `${Math.round(((stats.newUsersThisMonth - stats.newUsersLastMonth) / stats.newUsersLastMonth) * 100)}% MoM`;

    return (
        <Container size="xl" py="xl">
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end">
                    <Stack gap={2}>
                        <Title order={1}>🛠 Amakers 관리자 대시보드</Title>
                        <Text c="dimmed" size="sm">로그인: {session.user.email}</Text>
                    </Stack>
                    <Badge size="lg" color="violet" variant="light">SUPER ADMIN</Badge>
                </Group>

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

                <Stack gap={6}>
                    <Title order={3}>🤖 봇 레지스트리</Title>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                        <BotCard
                            kind="marketing"
                            title="마케팅봇"
                            desc="SNS·블로그 자동 발행, AI 캡션·이미지 생성"
                            domain="marketing.amakers.co.kr"
                            status="LIVE"
                            users={stats.totalUsers}
                        />
                        <BotCard
                            kind="design"
                            title="디자인봇"
                            desc="AI 디자인 템플릿 + 캔버스 에디터"
                            domain="design.amakers.co.kr"
                            status="PLANNED"
                            users={0}
                        />
                        <BotCard
                            kind="mockup"
                            title="목업봇"
                            desc="인쇄 출력 전 목업 미리보기 (티셔츠·머그·포스터 등)"
                            domain="mockup.amakers.co.kr"
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
        </Container>
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
        <Anchor component={Link} href={href} underline="never">
            <Paper withBorder p="md" radius="md" style={{ cursor: 'pointer' }}>
                <Group gap="sm">
                    <ThemeIcon size={32} radius="md" variant="light"><Icon size={16} /></ThemeIcon>
                    <Text fw={600} size="sm">{label}</Text>
                </Group>
            </Paper>
        </Anchor>
    );
}
