import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getBalance } from '@/lib/credit';
import { getUserByokStatus } from '@/lib/api-keys';
import {
    AppShell, Container, Title, Text, Stack, Group, Card, Badge, Button, SimpleGrid, ThemeIcon, Box,
    Image, Anchor, Paper,
} from '@mantine/core';
import { IconWand, IconPlus, IconCoin, IconClock, IconCheck, IconExternalLink, IconKey, IconBuildingStore } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard');

    const [products, balance, byokStatus] = await Promise.all([
        prisma.product.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 30,
            include: {
                _count: { select: { images: true, outputImages: true } },
                outputImages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: { r2Url: true },
                },
            },
        }),
        getBalance(userId),
        getUserByokStatus(userId),
    ]);
    const byokCount = Object.values(byokStatus).filter(Boolean).length;

    const sourceLabels: Record<string, string> = {
        coupang: '쿠팡', naver: '네이버', taobao: '타오바오', '1688': '1688',
        amazon: '아마존', generic: '기타',
    };

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size="lg" radius="md">
                                <IconWand size={20} />
                            </ThemeIcon>
                            <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>pdpbot</Title>
                            </Anchor>
                        </Group>
                        <Group gap="md">
                            <Anchor component={Link} href="/dashboard/billing" underline="never">
                                <Badge variant="light" color="violet" size="lg" leftSection={<IconCoin size={14} />}>
                                    {balance.toLocaleString()} credits
                                </Badge>
                            </Anchor>
                            <Button component={Link} href="/pricing" size="xs" variant="light" color="violet">
                                충전
                            </Button>
                            <Button
                                component={Link}
                                href="/dashboard/api-keys"
                                size="xs"
                                variant={byokCount > 0 ? 'filled' : 'subtle'}
                                color="teal"
                                leftSection={<IconKey size={14} />}
                            >
                                BYOK {byokCount > 0 && `(${byokCount}/3)`}
                            </Button>
                            <Button
                                component={Link}
                                href="/dashboard/channels"
                                size="xs"
                                variant="subtle"
                                color="orange"
                                leftSection={<IconBuildingStore size={14} />}
                            >
                                채널
                            </Button>
                            <Text size="sm" c="dimmed">{session?.user?.email}</Text>
                        </Group>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="xl">
                    <Group justify="space-between" mb="lg">
                        <Stack gap={2}>
                            <Title order={2}>대시보드</Title>
                            <Text c="dimmed" size="sm">처리한 상품 history + 새 상품 시작</Text>
                        </Stack>
                        <Button component={Link} href="/" leftSection={<IconPlus size={16} />} color="violet">
                            새 상품 처리
                        </Button>
                    </Group>

                    {/* BYOK 활성 알림 (헤비 유저용 비용 절감 옵션) */}
                    {byokCount > 0 && byokCount < 3 && (
                        <Paper withBorder p="sm" radius="md" mb="md" bg="teal.0">
                            <Group gap="xs">
                                <IconKey size={16} color="var(--mantine-color-teal-7)" />
                                <Text size="sm" c="teal.9">
                                    <strong>BYOK 부분 활성</strong> ({byokCount}/3 프로바이더) — 나머지 키도 입력하면 추가 절감.{' '}
                                    <Anchor component={Link} href="/dashboard/api-keys" size="sm" c="teal.7">
                                        설정
                                    </Anchor>
                                </Text>
                            </Group>
                        </Paper>
                    )}
                    {byokCount === 0 && balance >= 100 && products.length >= 5 && (
                        <Paper withBorder p="sm" radius="md" mb="md" bg="cyan.0">
                            <Group gap="xs" justify="space-between">
                                <Group gap="xs">
                                    <IconKey size={16} color="var(--mantine-color-cyan-7)" />
                                    <Text size="sm" c="cyan.9">
                                        💡 월 5+ 상품 처리 시 <strong>BYOK 모드</strong>로 비용 30~50% 절감 가능 — 본인 OpenAI/Anthropic/Replicate 키 입력.
                                    </Text>
                                </Group>
                                <Button component={Link} href="/dashboard/api-keys" size="xs" color="cyan" variant="light">
                                    BYOK 알아보기
                                </Button>
                            </Group>
                        </Paper>
                    )}

                    {/* 잔액 / 사용량 안내 */}
                    {balance < 50 && (
                        <Paper withBorder p="md" radius="md" mb="md" bg="orange.0">
                            <Group gap="xs">
                                <IconCoin size={20} color="var(--mantine-color-orange-6)" />
                                <Box>
                                    <Text fw={700} size="sm">credits 부족 ({balance})</Text>
                                    <Text size="xs" c="dimmed">
                                        이미지 1장 처리 ≈ 41 credits. 추가 충전이 필요합니다.
                                        (개발 중: <code>npm run seed:credits -- 1000</code>)
                                    </Text>
                                </Box>
                            </Group>
                        </Paper>
                    )}

                    {/* History */}
                    {products.length === 0 ? (
                        <Stack gap="md">
                            <Card withBorder p="xl" radius="md" ta="center">
                                <Stack gap="md" align="center" py="md">
                                    <ThemeIcon variant="light" color="violet" size={64} radius="xl">
                                        <IconWand size={36} />
                                    </ThemeIcon>
                                    <Stack gap={4}>
                                        <Text fw={700} size="lg">첫 상품을 시작해보세요 👋</Text>
                                        <Text size="sm" c="dimmed">
                                            쿠팡·네이버·타오바오·1688 URL → 한국어 합성 + 신규 상세페이지 자동 생성.
                                        </Text>
                                    </Stack>
                                    <Button component={Link} href="/" leftSection={<IconPlus size={16} />} color="violet" size="md">
                                        URL 입력해 시작
                                    </Button>
                                </Stack>
                            </Card>

                            {/* 처리 흐름 시각화 — 첫 사용자 가이드 */}
                            <Card withBorder p="md" radius="md">
                                <Text fw={700} size="sm" mb="sm">▶︎ 동작 흐름 (URL → 결과까지 약 2-3분)</Text>
                                <SimpleGrid cols={{ base: 1, md: 5 }} spacing="xs">
                                    {[
                                        { n: '1', title: 'URL 입력', desc: '쿠팡/타오바오 등' },
                                        { n: '2', title: '이미지 추출', desc: '자동 스크래핑' },
                                        { n: '3', title: 'AI 처리', desc: 'OCR → 번역 → 인페인팅' },
                                        { n: '4', title: '한국어 합성', desc: 'Pretendard 폰트' },
                                        { n: '5', title: '다운로드', desc: 'PNG / ZIP' },
                                    ].map((s) => (
                                        <Paper key={s.n} withBorder p="xs" radius="sm" ta="center">
                                            <Badge size="lg" variant="light" color="violet" mb={4}>{s.n}</Badge>
                                            <Text size="xs" fw={700}>{s.title}</Text>
                                            <Text size="11px" c="dimmed">{s.desc}</Text>
                                        </Paper>
                                    ))}
                                </SimpleGrid>
                            </Card>

                            {/* 비용 안내 */}
                            <Paper withBorder p="md" radius="md" bg="violet.0">
                                <Text fw={700} size="sm" mb="xs">💰 1상품 처리 비용 (참고)</Text>
                                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xs">
                                    <Box>
                                        <Text size="xs" c="dimmed">Phase 1 — 한국어 합성</Text>
                                        <Text size="sm" fw={700}>~41 credits / 이미지</Text>
                                    </Box>
                                    <Box>
                                        <Text size="xs" c="dimmed">Phase 2 — AI 분석</Text>
                                        <Text size="sm" fw={700}>10 credits / 1회</Text>
                                    </Box>
                                    <Box>
                                        <Text size="xs" c="dimmed">Phase 3 — 신규 페이지 (8섹션)</Text>
                                        <Text size="sm" fw={700}>~166 credits / 1세트</Text>
                                    </Box>
                                </SimpleGrid>
                                <Text size="11px" c="dimmed" mt="xs">
                                    💡 <strong>BYOK 모드</strong>로 외부 AI 비용 절감 가능 ({' '}
                                    <Anchor component={Link} href="/dashboard/api-keys" size="11px">설정</Anchor>
                                    )
                                </Text>
                            </Paper>
                        </Stack>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                            {products.map((p) => {
                                const thumb = p.outputImages[0]?.r2Url;
                                return (
                                    <Card key={p.id} withBorder p="md" radius="md">
                                        {thumb ? (
                                            <Image src={thumb} radius="sm" fit="cover" h={160} alt={p.title || ''} />
                                        ) : (
                                            <Box h={160} bg="gray.1" style={{ borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <IconClock size={28} color="var(--mantine-color-gray-5)" />
                                            </Box>
                                        )}
                                        <Stack gap={4} mt="sm">
                                            <Group gap={4}>
                                                <Badge size="xs" variant="light">{sourceLabels[p.source] || p.source}</Badge>
                                                <Badge size="xs" variant="light" color="teal">
                                                    {p._count.outputImages}/{p._count.images} 처리됨
                                                </Badge>
                                            </Group>
                                            <Text fw={600} size="sm" lineClamp={2}>
                                                {p.title || '(제목 없음)'}
                                            </Text>
                                            <Text size="11px" c="dimmed">
                                                {dayjs(p.createdAt).format('YYYY-MM-DD HH:mm')}
                                            </Text>
                                            <Group gap="xs" mt="xs">
                                                <Button
                                                    component={Link}
                                                    href={`/product/${p.id}`}
                                                    size="xs"
                                                    variant="light"
                                                    leftSection={<IconCheck size={12} />}
                                                >
                                                    상세
                                                </Button>
                                                {p.sourceUrl && (
                                                    <Button
                                                        component="a"
                                                        href={p.sourceUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        size="xs"
                                                        variant="subtle"
                                                        color="gray"
                                                        leftSection={<IconExternalLink size={12} />}
                                                    >
                                                        원본
                                                    </Button>
                                                )}
                                            </Group>
                                        </Stack>
                                    </Card>
                                );
                            })}
                        </SimpleGrid>
                    )}
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
