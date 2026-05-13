'use client';

import { useState } from 'react';
import {
    AppShell, Container, Title, Text, Stack, Group, Card, Badge, Button, SimpleGrid,
    ThemeIcon, Box, Anchor,
} from '@mantine/core';
import { IconBrush, IconCoin, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

const PACKAGES = [
    { credits: 100, priceKrw: 10_000, label: '🌱 Starter', desc: 'AI 디자인 ~6건 생성', recommended: false },
    { credits: 500, priceKrw: 45_000, label: '☕ Light', desc: 'AI 디자인 ~35건 · 10% 할인', recommended: false },
    { credits: 1500, priceKrw: 120_000, label: '🚀 Pro', desc: 'AI 디자인 ~100건 · 20% 할인', recommended: true },
    { credits: 5000, priceKrw: 350_000, label: '🏢 Business', desc: 'AI 디자인 ~350건 · 30% 할인', recommended: false },
];

const COST_TABLE = [
    { action: '캔버스 편집·저장·export', cost: '무료' },
    { action: 'AI 레이아웃 생성 (Claude)', cost: '10 cr' },
    { action: 'AI 배경 이미지 생성 (FLUX)', cost: '20 cr' },
    { action: '상품 분석 → 자동 광고 (pdpbot 연동)', cost: '10 cr' },
    { action: '템플릿 저장·사용', cost: '무료' },
];

export default function PricingPage() {
    const [loading, setLoading] = useState<number | null>(null);

    const handleBuy = async (credits: number, priceKrw: number) => {
        setLoading(credits);
        try {
            const r = await fetch('/api/checkout/credits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credits, priceKrw }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '체크아웃 실패');
            window.location.href = data.url;
        } catch (e: any) {
            setLoading(null);
            notifications.show({
                title: '결제 시작 실패',
                message: e?.message || '잠시 후 다시 시도해주세요',
                color: 'red',
            });
        }
    };

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
                        <Button component={Link} href="/dashboard" variant="light" size="xs">대시보드</Button>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="lg">
                    <Stack gap="md" align="center" mb="xl">
                        <Badge size="lg" variant="filled" color="violet">사용량 기반 결제</Badge>
                        <Title order={1} ta="center">필요한 만큼만 충전</Title>
                        <Text c="dimmed" ta="center" maw={600}>
                            구독 묶음 X. 충전한 credits 는 만료 없음.
                            pdpbot · 마케팅봇 등 모든 amakers 봇에서 같은 잔액 공유.
                        </Text>
                    </Stack>

                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="xl">
                        {PACKAGES.map((pkg) => (
                            <Card
                                key={pkg.credits}
                                withBorder
                                p="lg"
                                radius="md"
                                shadow={pkg.recommended ? 'lg' : 'sm'}
                                style={pkg.recommended ? { borderColor: 'var(--mantine-color-violet-6)', borderWidth: 2 } : {}}
                            >
                                {pkg.recommended && (
                                    <Badge color="violet" variant="filled" mb="xs">추천</Badge>
                                )}
                                <Stack gap="xs">
                                    <Text fw={700} size="lg">{pkg.label}</Text>
                                    <Group align="baseline" gap={4}>
                                        <Text fw={900} size="32px" c="violet.7">
                                            {pkg.credits.toLocaleString()}
                                        </Text>
                                        <Text c="dimmed" size="sm">credits</Text>
                                    </Group>
                                    <Text size="lg" fw={700}>
                                        ₩{pkg.priceKrw.toLocaleString()}
                                    </Text>
                                    <Text size="xs" c="dimmed">{pkg.desc}</Text>
                                    <Button
                                        fullWidth
                                        mt="sm"
                                        color={pkg.recommended ? 'violet' : 'gray'}
                                        variant={pkg.recommended ? 'filled' : 'light'}
                                        onClick={() => handleBuy(pkg.credits, pkg.priceKrw)}
                                        loading={loading === pkg.credits}
                                        rightSection={<IconArrowRight size={14} />}
                                    >
                                        충전하기
                                    </Button>
                                </Stack>
                            </Card>
                        ))}
                    </SimpleGrid>

                    {/* 기능별 단가 */}
                    <Box maw={500} mx="auto" mb="xl">
                        <Text fw={700} mb="xs">💡 단가 (credits)</Text>
                        <Stack gap={4}>
                            {COST_TABLE.map(row => (
                                <Group key={row.action} justify="space-between" gap="xs">
                                    <Group gap="xs">
                                        <IconCheck size={12} color="var(--mantine-color-teal-6)" />
                                        <Text size="sm">{row.action}</Text>
                                    </Group>
                                    <Badge variant="light" color={row.cost === '무료' ? 'teal' : 'violet'} size="sm">
                                        {row.cost}
                                    </Badge>
                                </Group>
                            ))}
                        </Stack>
                    </Box>

                    <Box ta="center" mb="xl">
                        <Text size="xs" c="dimmed">
                            결제는 Stripe 에서 안전하게 처리. 카드 정보는 amakers 서버에 저장 X.
                        </Text>
                    </Box>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
