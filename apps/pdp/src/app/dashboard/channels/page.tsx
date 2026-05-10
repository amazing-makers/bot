import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
    AppShell, Container, Title, Text, Stack, Group, ThemeIcon, Anchor, Card, Badge, Button, Paper, SimpleGrid, Box,
} from '@mantine/core';
import {
    IconWand, IconArrowLeft, IconBuildingStore, IconBrandShopee, IconShoppingCart, IconClock,
    IconExternalLink, IconCheck,
} from '@tabler/icons-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface ChannelStatus {
    id: string;
    name: string;
    market: 'KR' | 'GLOBAL';
    apiAvailable: 'public' | 'partner-required' | 'manual-only';
    pdpbotStatus: 'planned' | 'beta' | 'live';
    note: string;
    docsUrl?: string;
}

const CHANNELS: ChannelStatus[] = [
    {
        id: 'coupang',
        name: '쿠팡 Wing',
        market: 'KR',
        apiAvailable: 'partner-required',
        pdpbotStatus: 'planned',
        note: 'Wing API — 마켓플레이스 셀러 등록 후 신청. pdpbot 통합은 Phase 4 (예정).',
        docsUrl: 'https://developers.coupangcorp.com/hc/ko',
    },
    {
        id: 'naver-smartstore',
        name: '네이버 스마트스토어',
        market: 'KR',
        apiAvailable: 'partner-required',
        pdpbotStatus: 'planned',
        note: 'Commerce API — 스마트스토어 가입 후 API 사용 신청. Phase 4 (예정).',
        docsUrl: 'https://apicenter.commerce.naver.com/',
    },
    {
        id: 'gmarket-auction',
        name: '지마켓·옥션 (ESM Plus)',
        market: 'KR',
        apiAvailable: 'partner-required',
        pdpbotStatus: 'planned',
        note: 'ESM Plus API. Phase 4 후반.',
    },
    {
        id: '11st',
        name: '11번가',
        market: 'KR',
        apiAvailable: 'partner-required',
        pdpbotStatus: 'planned',
        note: 'Open API — 셀러 가입 후 신청. Phase 4 후반.',
    },
    {
        id: 'manual-download',
        name: '직접 업로드 (다운로드)',
        market: 'GLOBAL',
        apiAvailable: 'manual-only',
        pdpbotStatus: 'live',
        note: 'ZIP 다운로드 → 셀러 어드민에 직접 업로드. 현재 모든 채널 지원.',
    },
];

const STATUS_LABEL: Record<ChannelStatus['pdpbotStatus'], { label: string; color: string }> = {
    live:    { label: '✅ 사용 가능', color: 'teal' },
    beta:    { label: '🧪 베타',      color: 'yellow' },
    planned: { label: '📋 계획됨',    color: 'gray' },
};

export default async function ChannelsPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/channels');

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
                            <Group gap="xs">
                                <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size="lg" radius="md">
                                    <IconWand size={20} />
                                </ThemeIcon>
                                <Title order={3}>pdpbot</Title>
                            </Group>
                        </Anchor>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="lg">
                    <Group mb="md">
                        <Anchor component={Link} href="/dashboard" size="sm">
                            <Group gap={4}><IconArrowLeft size={14} /> 대시보드</Group>
                        </Anchor>
                    </Group>

                    <Stack gap="lg">
                        <Stack gap={4}>
                            <Group gap="xs">
                                <ThemeIcon variant="gradient" gradient={{ from: 'orange', to: 'red' }} size="lg" radius="md">
                                    <IconBuildingStore size={20} />
                                </ThemeIcon>
                                <Title order={2}>채널 자동 업로드</Title>
                                <Badge variant="light" color="orange">Phase 4 진행 중</Badge>
                            </Group>
                            <Text size="sm" c="dimmed">
                                생성된 상세페이지를 셀러 채널에 자동 등록 (Phase 4). 현재는 ZIP 다운로드 → 직접 업로드만 가능.
                            </Text>
                        </Stack>

                        {/* 현재 가능 — manual download */}
                        <Paper withBorder p="md" radius="md" bg="teal.0">
                            <Group justify="space-between" mb="xs">
                                <Group gap="xs">
                                    <ThemeIcon variant="light" color="teal" size="md"><IconCheck size={16} /></ThemeIcon>
                                    <Text fw={700}>지금 사용 가능: 직접 업로드</Text>
                                </Group>
                            </Group>
                            <Text size="sm" mb="xs">
                                <strong>1.</strong> 상품 페이지에서 "전체 ZIP 다운로드" → ZIP 안에 모든 결과 PNG + analysis.json + outline.json 포함.<br />
                                <strong>2.</strong> 쿠팡 Wing / 네이버 셀러센터 / 11번가 등 셀러 어드민 페이지에서 직접 이미지 업로드.<br />
                                <strong>3.</strong> 마케팅 카피·키워드는 analysis.json 에서 그대로 복붙.
                            </Text>
                            <Text size="11px" c="dimmed">
                                ⓘ 셀러 1명 기준 1상품 등록 ~5분 (이미지 업로드 + 카피 + 옵션). 자동 업로드 기능 출시 시 1분 이내로 단축 예정.
                            </Text>
                        </Paper>

                        {/* 채널 status */}
                        <Stack gap="xs">
                            <Text fw={700} size="sm">채널별 통합 상태</Text>
                            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                                {CHANNELS.map(c => {
                                    const status = STATUS_LABEL[c.pdpbotStatus];
                                    return (
                                        <Card key={c.id} withBorder p="md" radius="md">
                                            <Group justify="space-between" mb={4}>
                                                <Group gap={6}>
                                                    <Text fw={700}>{c.name}</Text>
                                                    <Badge size="xs" variant="dot" color={c.market === 'KR' ? 'red' : 'blue'}>
                                                        {c.market === 'KR' ? '한국' : '글로벌'}
                                                    </Badge>
                                                </Group>
                                                <Badge variant="light" color={status.color} size="sm">{status.label}</Badge>
                                            </Group>
                                            <Text size="xs" c="dimmed" mb="xs">{c.note}</Text>
                                            {c.docsUrl && (
                                                <Anchor href={c.docsUrl} target="_blank" rel="noreferrer" size="xs">
                                                    <Group gap={4}>API 문서 <IconExternalLink size={11} /></Group>
                                                </Anchor>
                                            )}
                                        </Card>
                                    );
                                })}
                            </SimpleGrid>
                        </Stack>

                        {/* 로드맵 */}
                        <Paper withBorder p="md" radius="md">
                            <Text fw={700} size="sm" mb="xs">📋 Phase 4 로드맵</Text>
                            <Stack gap={6}>
                                <Group gap="xs">
                                    <Badge variant="light" color="violet" size="sm">4.1</Badge>
                                    <Text size="sm"><strong>쿠팡 Wing API 통합</strong> — 셀러 키 입력 → 상품 자동 등록 (이미지 + 옵션 + 카피).</Text>
                                </Group>
                                <Group gap="xs">
                                    <Badge variant="light" color="violet" size="sm">4.2</Badge>
                                    <Text size="sm"><strong>네이버 Commerce API</strong> — 스마트스토어 자동 등록.</Text>
                                </Group>
                                <Group gap="xs">
                                    <Badge variant="light" color="violet" size="sm">4.3</Badge>
                                    <Text size="sm"><strong>일괄 업로드</strong> — 여러 상품을 한 번에 여러 채널에.</Text>
                                </Group>
                                <Group gap="xs">
                                    <Badge variant="light" color="violet" size="sm">4.4</Badge>
                                    <Text size="sm"><strong>옵션 자동 매핑</strong> — 색상/사이즈 등 변형 옵션도 분석·매핑.</Text>
                                </Group>
                            </Stack>
                            <Text size="11px" c="dimmed" mt="xs">
                                ⓘ 각 채널 API 는 셀러 별도 가입·승인 필요. pdpbot 은 승인된 키 받아 자동 호출만 담당.
                            </Text>
                        </Paper>

                        {/* 베타 신청 hint */}
                        <Paper withBorder p="md" radius="md" bg="violet.0">
                            <Group gap="xs">
                                <IconClock size={16} color="var(--mantine-color-violet-7)" />
                                <Box>
                                    <Text size="sm" fw={700}>Phase 4 베타 테스터 모집 (예정)</Text>
                                    <Text size="xs" c="dimmed">
                                        쿠팡 Wing 또는 네이버 Commerce API 사용 권한 있으신 셀러분, 베타 출시 시 우선 안내드립니다.
                                        관심 있으시면 help@amakers.co.kr 로 메일 주세요.
                                    </Text>
                                </Box>
                            </Group>
                        </Paper>
                    </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
