import {
    AppShell, Container, Title, Text, Stack, Group, Badge, Button, ThemeIcon, Box, Paper, SimpleGrid, Anchor,
} from '@mantine/core';
import {
    IconBrush, IconBrandInstagram, IconShoppingBag, IconWand, IconBolt,
} from '@tabler/icons-react';
import Link from 'next/link';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
    const session = await auth();
    const loggedIn = !!session?.user;

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'pink', to: 'orange' }} size="lg" radius="md">
                                <IconBrush size={20} />
                            </ThemeIcon>
                            <Title order={3}>designbot</Title>
                            <Badge variant="light" color="pink" size="sm">Phase 1 MVP</Badge>
                        </Group>
                        <Group gap="xs">
                            {loggedIn ? (
                                <Button component={Link} href="/dashboard" variant="filled" color="pink">대시보드</Button>
                            ) : (
                                <Button component={Link} href="/login" variant="light">로그인</Button>
                            )}
                        </Group>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="lg">
                    {/* Hero */}
                    <Paper p="xl" radius="lg" mb="xl"
                        style={{ background: 'linear-gradient(135deg, var(--mantine-color-pink-1), var(--mantine-color-orange-1))' }}
                    >
                        <Stack gap="md" align="center" ta="center">
                            <Badge size="lg" variant="filled" color="pink">셀러용 디자인 자동화</Badge>
                            <Title order={1} size={48} fw={900}>
                                AI 디자인봇
                            </Title>
                            <Text size="xl" c="dimmed" maw={700}>
                                인스타·쿠팡·네이버 — 채널별 사이즈에 맞춰 빠르게 디자인.
                                <br />
                                <strong>디자이너 없이도 5분 만에 완성.</strong>
                            </Text>
                            <Group gap="xs">
                                <Badge variant="light" leftSection={<IconBrandInstagram size={12} />}>인스타 정사각/스토리</Badge>
                                <Badge variant="light" leftSection={<IconShoppingBag size={12} />}>쿠팡 메인</Badge>
                                <Badge variant="light" leftSection={<IconShoppingBag size={12} />}>네이버 배너</Badge>
                            </Group>
                            <Group gap="xs" mt="md">
                                {loggedIn ? (
                                    <Button component={Link} href="/dashboard" size="lg" color="pink">바로 시작</Button>
                                ) : (
                                    <>
                                        <Button component={Link} href="/login" size="lg" color="pink">로그인하고 시작</Button>
                                        <Button component="a" href="https://marketingbot.amakers.co.kr" variant="light" size="lg">마케팅봇 보기</Button>
                                    </>
                                )}
                            </Group>
                        </Stack>
                    </Paper>

                    {/* 핵심 기능 */}
                    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md" mb="xl">
                        <Paper withBorder p="md" radius="md">
                            <ThemeIcon variant="light" color="pink" size="lg" radius="md" mb="xs"><IconWand size={20} /></ThemeIcon>
                            <Text fw={700} mb={4}>드래그 + 드롭 캔버스</Text>
                            <Text size="sm" c="dimmed">텍스트, 도형, 이미지를 자유롭게 배치. Konva 기반의 빠른 캔버스.</Text>
                        </Paper>
                        <Paper withBorder p="md" radius="md">
                            <ThemeIcon variant="light" color="orange" size="lg" radius="md" mb="xs"><IconBolt size={20} /></ThemeIcon>
                            <Text fw={700} mb={4}>한국 셀러 표준 사이즈</Text>
                            <Text size="sm" c="dimmed">인스타 정사각·스토리, 쿠팡 1000×1000, 네이버 750×420 등 5종 preset.</Text>
                        </Paper>
                        <Paper withBorder p="md" radius="md">
                            <ThemeIcon variant="light" color="violet" size="lg" radius="md" mb="xs"><IconBrush size={20} /></ThemeIcon>
                            <Text fw={700} mb={4}>AI 자동 생성 (Phase 2)</Text>
                            <Text size="sm" c="dimmed">프롬프트 → 디자인 완성. Claude + FLUX 결합. 예정.</Text>
                        </Paper>
                    </SimpleGrid>

                    {/* 다른 봇과 연결 */}
                    <Paper withBorder p="md" radius="md">
                        <Text fw={700} size="sm" mb="xs">🔗 amakers 플랫폼 패밀리</Text>
                        <Group gap="xs">
                            <Anchor href="https://marketingbot.amakers.co.kr" size="sm">marketingbot</Anchor>
                            <Text size="sm" c="dimmed">·</Text>
                            <Anchor href="https://pdpbot.amakers.co.kr" size="sm">pdpbot</Anchor>
                            <Text size="sm" c="dimmed">·</Text>
                            <Text size="sm" c="dimmed">designbot (current)</Text>
                        </Group>
                        <Text size="xs" c="dimmed" mt="xs">
                            ⓘ 같은 계정 / 같은 credits — 한 번 로그인하면 모든 봇 자동 접속.
                        </Text>
                    </Paper>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
