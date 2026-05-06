import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, Stack, Paper, Group, Badge, Box, Progress, SimpleGrid, ThemeIcon, Anchor,
} from '@mantine/core';
import {
    IconUsers, IconWorld, IconSpeakerphone, IconCheck, IconBolt, IconTrendingDown,
} from '@tabler/icons-react';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';
export const metadata = { title: '온보딩 Funnel · Amakers Admin' };

interface PageProps {
    searchParams: Promise<{ days?: string }>;
}

interface Stage {
    key: string;
    label: string;
    description: string;
    count: number;
    icon: React.ReactNode;
    color: string;
}

export default async function OnboardingFunnelPage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) redirect('/login');

    const sp = await searchParams;
    const days = parseInt(sp.days || '30', 10);
    const sinceDate = dayjs().subtract(days, 'day').toDate();

    // 가입 기간 내 사용자
    const cohort = await prisma.user.findMany({
        where: { createdAt: { gte: sinceDate } },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            onboardingCompletedAt: true,
            _count: {
                select: { channels: true, campaigns: true },
            },
        },
    });

    const totalSignups = cohort.length;

    // 단계별 카운트 (각 단계 통과 = 모든 이전 단계도 통과)
    const completedOnboarding = cohort.filter(u => !!u.onboardingCompletedAt).length;
    const hasChannel = cohort.filter(u => u._count.channels > 0).length;
    const hasCampaign = cohort.filter(u => u._count.campaigns > 0).length;

    // 첫 발행 SUCCESS 카운트 (별도 쿼리)
    const userIds = cohort.map(u => u.id);
    const firstSuccessUsers = userIds.length === 0 ? 0 : await prisma.scheduledTask.groupBy({
        by: ['campaignId'],
        where: {
            campaign: { userId: { in: userIds } },
            status: 'SUCCESS',
        },
        _count: { _all: true },
    }).then(async (groups) => {
        // 각 캠페인의 user 가 cohort 에 포함된 유저인지 확인 → unique user 카운트
        if (groups.length === 0) return 0;
        const campaignIds = groups.map(g => g.campaignId);
        const campaigns = await prisma.campaign.findMany({
            where: { id: { in: campaignIds } },
            select: { userId: true },
        });
        const userSet = new Set(campaigns.map(c => c.userId));
        return userSet.size;
    });

    const stages: Stage[] = [
        {
            key: 'signup',
            label: '회원가입',
            description: '신규 사용자 가입',
            count: totalSignups,
            icon: <IconUsers size={20} />,
            color: 'gray',
        },
        {
            key: 'onboarding',
            label: '온보딩 완료',
            description: '5단계 완료 + 업종 선택',
            count: completedOnboarding,
            icon: <IconCheck size={20} />,
            color: 'blue',
        },
        {
            key: 'channel',
            label: '첫 채널 연결',
            description: 'SNS 채널 1개+ 등록',
            count: hasChannel,
            icon: <IconWorld size={20} />,
            color: 'teal',
        },
        {
            key: 'campaign',
            label: '첫 캠페인 작성',
            description: '게시물 1개+ 작성',
            count: hasCampaign,
            icon: <IconSpeakerphone size={20} />,
            color: 'violet',
        },
        {
            key: 'publish',
            label: '첫 발행 성공',
            description: 'SUCCESS task 1개+',
            count: firstSuccessUsers,
            icon: <IconBolt size={20} />,
            color: 'orange',
        },
    ];

    // 막힘 지점 (drop-off) 분석 — 가장 큰 손실 단계
    let biggestDropoff = { fromIdx: 0, dropPct: 0 };
    for (let i = 1; i < stages.length; i++) {
        const prev = stages[i - 1].count;
        const cur = stages[i].count;
        if (prev > 0) {
            const dropPct = Math.round(((prev - cur) / prev) * 100);
            if (dropPct > biggestDropoff.dropPct) {
                biggestDropoff = { fromIdx: i - 1, dropPct };
            }
        }
    }

    // 막힘 사용자 목록 (캠페인 작성 단계 → 발행 SUCCESS 못 한)
    const stuckAtPublish = cohort.filter(u => u._count.campaigns > 0 && u._count.channels > 0).slice(0, 10);

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Group gap={6}>
                    <IconTrendingDown size={24} />
                    <Title order={2}>📉 온보딩 Funnel</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    최근 {days}일 가입자의 단계별 통과율 — 어디서 이탈하는지 한눈에 파악
                </Text>
                <Group gap="xs" mt="xs">
                    {[7, 14, 30, 60, 90].map(d => (
                        <Anchor
                            key={d}
                            href={`/onboarding-funnel?days=${d}`}
                            size="xs"
                            c={days === d ? 'violet' : 'dimmed'}
                            fw={days === d ? 700 : 400}
                        >
                            최근 {d}일
                        </Anchor>
                    ))}
                </Group>
            </Stack>

            {/* Funnel 시각화 */}
            <Paper withBorder p="lg" radius="md">
                <Text fw={700} mb="md">단계별 통과율</Text>
                <Stack gap="md">
                    {stages.map((s, i) => {
                        const pctOfSignup = totalSignups > 0 ? Math.round((s.count / totalSignups) * 100) : 0;
                        const prevCount = i === 0 ? totalSignups : stages[i - 1].count;
                        const stepDropPct = prevCount > 0 ? Math.round(((prevCount - s.count) / prevCount) * 100) : 0;
                        const isBiggestDrop = i > 0 && i === biggestDropoff.fromIdx + 1 && stepDropPct > 0;

                        return (
                            <Box key={s.key}>
                                <Group justify="space-between" mb={4}>
                                    <Group gap={6}>
                                        <ThemeIcon size={28} radius="md" color={s.color} variant="light">
                                            {s.icon}
                                        </ThemeIcon>
                                        <Stack gap={0}>
                                            <Text fw={700} size="sm">{s.label}</Text>
                                            <Text size="11px" c="dimmed">{s.description}</Text>
                                        </Stack>
                                    </Group>
                                    <Group gap={8}>
                                        {isBiggestDrop && (
                                            <Badge size="xs" color="red" variant="filled">
                                                🚨 최대 이탈 ({stepDropPct}% 손실)
                                            </Badge>
                                        )}
                                        <Stack gap={0} align="flex-end">
                                            <Text fw={800} size="lg">{s.count.toLocaleString()}명</Text>
                                            <Text size="11px" c="dimmed">{pctOfSignup}% (가입 대비)</Text>
                                        </Stack>
                                    </Group>
                                </Group>
                                <Progress
                                    value={pctOfSignup}
                                    color={s.color}
                                    size="md"
                                    radius="md"
                                />
                                {i < stages.length - 1 && stepDropPct > 0 && (
                                    <Group gap={4} mt={4} justify="flex-end">
                                        <IconTrendingDown size={11} color="var(--mantine-color-red-6)" />
                                        <Text size="11px" c="red.7" fw={600}>
                                            -{stepDropPct}% 다음 단계까지 이탈
                                        </Text>
                                    </Group>
                                )}
                            </Box>
                        );
                    })}
                </Stack>
            </Paper>

            {/* 인사이트 카드 */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                <Paper withBorder p="md" radius="md">
                    <Text size="xs" c="dimmed" fw={600} mb={4}>전체 활성화율</Text>
                    <Text fw={800} size="24px">
                        {totalSignups > 0 ? Math.round((firstSuccessUsers / totalSignups) * 100) : 0}%
                    </Text>
                    <Text size="11px" c="dimmed">가입 → 첫 발행 성공</Text>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Text size="xs" c="dimmed" fw={600} mb={4}>최대 이탈 단계</Text>
                    <Text fw={800} size="md">
                        {biggestDropoff.dropPct > 0 ? `${stages[biggestDropoff.fromIdx].label} → ${stages[biggestDropoff.fromIdx + 1]?.label}` : '없음'}
                    </Text>
                    <Text size="11px" c="red.7" fw={600}>
                        {biggestDropoff.dropPct > 0 ? `${biggestDropoff.dropPct}% 손실` : '균등 통과'}
                    </Text>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Text size="xs" c="dimmed" fw={600} mb={4}>막힘 사용자</Text>
                    <Text fw={800} size="24px">
                        {hasCampaign - firstSuccessUsers}명
                    </Text>
                    <Text size="11px" c="dimmed">캠페인 작성했지만 발행 못 함</Text>
                </Paper>
            </SimpleGrid>

            {/* 막힘 사용자 리스트 — 운영자가 직접 도와줄 수 있음 */}
            {stuckAtPublish.length > 0 && (
                <Paper withBorder p="md" radius="md">
                    <Text fw={700} size="sm" mb="sm">캠페인 작성 후 막혀있는 사용자 (10명)</Text>
                    <Text size="11px" c="dimmed" mb="md">
                        채널·캠페인 모두 있지만 SUCCESS 못 한 사용자. 채널 인증 문제·에이전트 미설치 등이 원인일 수 있어요.
                    </Text>
                    <Stack gap="xs">
                        {stuckAtPublish.map(u => (
                            <Group key={u.id} justify="space-between" wrap="nowrap">
                                <Anchor href={`/users/${u.id}`} size="sm" fw={600}>
                                    {u.email}
                                </Anchor>
                                <Group gap={6}>
                                    <Badge size="xs" variant="light">{u._count.channels}채널</Badge>
                                    <Badge size="xs" variant="light">{u._count.campaigns}캠페인</Badge>
                                    <Text size="11px" c="dimmed">
                                        {dayjs().diff(u.createdAt, 'day')}일 전 가입
                                    </Text>
                                </Group>
                            </Group>
                        ))}
                    </Stack>
                </Paper>
            )}
        </Stack>
    );
}
