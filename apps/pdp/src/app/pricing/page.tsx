'use client';

import { useState } from 'react';
import {
    AppShell, Container, Title, Text, Stack, Group, Card, Badge, Button, SimpleGrid, ThemeIcon, Box, Anchor,
} from '@mantine/core';
import { IconWand, IconCoin, IconCheck, IconArrowRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

const PACKAGES = [
    { credits: 100, priceKrw: 10_000, label: '🌱 Starter', desc: '이미지 ~2장 처리', recommended: false },
    { credits: 500, priceKrw: 45_000, label: '☕ Light', desc: '이미지 ~12장 · 10% 할인', recommended: false },
    { credits: 1500, priceKrw: 120_000, label: '🚀 Pro', desc: '이미지 ~36장 · 20% 할인', recommended: true },
    { credits: 5000, priceKrw: 350_000, label: '🏢 Business', desc: '이미지 ~120장 · 30% 할인', recommended: false },
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
            // Stripe checkout 으로 redirect
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
                        <Group gap="xs">
                            <Anchor component={Link} href="/" underline="never" c="inherit">
                                <Group gap="xs">
                                    <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size="lg" radius="md">
                                        <IconWand size={20} />
                                    </ThemeIcon>
                                    <Title order={3}>pdpbot</Title>
                                </Group>
                            </Anchor>
                        </Group>
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
                            구독 묶음 X. 한 상품을 처리할 때마다 ~41 credits 차감.
                            한 번 충전한 credits 는 만료 X · 다른 amakers 봇 (마케팅봇 등) 에서도 같은 잔액 사용 가능.
                        </Text>
                    </Stack>

                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
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

                    <Box mt="xl" ta="center">
                        <Text size="xs" c="dimmed">
                            결제는 Stripe 에서 안전하게 처리. 카드 정보는 amakers 서버에 저장 X.
                        </Text>
                    </Box>

                    <Stack gap="xs" mt="xl" maw={600} mx="auto">
                        <Text fw={700}>💡 단가 (참고)</Text>
                        <Text size="sm" c="dimmed">
                            • 이미지 1장 처리 ≈ 41 credits
                            (OCR 5 + 인페인팅 30 + 번역 5 + 합성 1)<br />
                            • 마케팅봇 발행 1회 ≈ 1 credit (클라우드 채널) 또는 2 credits (에이전트)<br />
                            • credits 는 모든 amakers 봇 공통 잔액 사용
                        </Text>
                    </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
