import {
    Box,
    Button,
    Container,
    Grid,
    Group,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from '@mantine/core';
import {
    IconBolt,
    IconPhoto,
    IconShirt,
    IconDownload,
} from '@tabler/icons-react';
import Link from 'next/link';

const features = [
    {
        icon: IconPhoto,
        title: '상품 이미지 업로드',
        description: '판매 중인 상품 이미지를 업로드하면 AI가 자동으로 분석합니다.',
        color: 'blue',
    },
    {
        icon: IconShirt,
        title: '목업 컨텍스트 선택',
        description: '티셔츠, 머그컵, 포스터, 빌보드 등 8가지 목업 타입 중 선택하세요.',
        color: 'violet',
    },
    {
        icon: IconBolt,
        title: 'FLUX Kontext AI 합성',
        description: 'Black Forest Labs의 최신 FLUX Kontext Pro 모델이 자연스러운 라이프스타일 목업을 생성합니다.',
        color: 'orange',
    },
    {
        icon: IconDownload,
        title: '고화질 다운로드',
        description: '생성된 목업 이미지를 즉시 다운로드하여 상세 페이지나 SNS에 사용하세요.',
        color: 'green',
    },
];

const mockupTypes = [
    { emoji: '👕', label: '티셔츠' },
    { emoji: '🧥', label: '후드티' },
    { emoji: '☕', label: '머그컵' },
    { emoji: '🖼️', label: '포스터' },
    { emoji: '📢', label: '빌보드' },
    { emoji: '👜', label: '토트백' },
    { emoji: '📱', label: '폰케이스' },
    { emoji: '🎨', label: '액자' },
];

export default function HomePage() {
    return (
        <Box>
            {/* Header */}
            <Box py="md" px="xl" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                <Group justify="space-between" maw={1200} mx="auto">
                    <Group gap="xs">
                        <Text fw={800} size="xl" c="violet">mockupbot</Text>
                        <Text size="xs" c="dimmed" mt={2}>by amakers</Text>
                    </Group>
                    <Group gap="sm">
                        <Button component={Link} href="/login" variant="subtle" size="sm">
                            로그인
                        </Button>
                        <Button component={Link} href="/dashboard" size="sm" color="violet">
                            시작하기
                        </Button>
                    </Group>
                </Group>
            </Box>

            {/* Hero */}
            <Container size="lg" py={80}>
                <Stack align="center" gap="xl">
                    <Stack align="center" gap="md">
                        <Text size="sm" fw={600} c="violet" tt="uppercase" ls={2}>
                            AI 상품 목업 생성기
                        </Text>
                        <Title order={1} ta="center" size="3.5rem" fw={900} lh={1.1}>
                            상품 사진 하나로
                            <br />
                            <Text span c="violet" inherit>라이프스타일 목업</Text>을
                            <br />
                            10초만에 완성
                        </Title>
                        <Text size="lg" c="dimmed" ta="center" maw={600}>
                            한국 이커머스 셀러를 위한 AI 목업 생성 도구.
                            상품 이미지를 업로드하고 목업 타입을 선택하면
                            FLUX Kontext가 자연스러운 라이프스타일 사진을 만들어 드립니다.
                        </Text>
                    </Stack>

                    <Group gap="md">
                        <Button
                            component={Link}
                            href="/dashboard"
                            size="lg"
                            color="violet"
                            radius="xl"
                            px={40}
                        >
                            무료로 시작하기
                        </Button>
                        <Button
                            component={Link}
                            href="/login"
                            size="lg"
                            variant="outline"
                            radius="xl"
                            px={40}
                        >
                            로그인
                        </Button>
                    </Group>

                    {/* Mockup type pills */}
                    <Group gap="xs" justify="center" mt="md">
                        {mockupTypes.map((t) => (
                            <Box
                                key={t.label}
                                px="md"
                                py="xs"
                                style={{
                                    borderRadius: 'var(--mantine-radius-xl)',
                                    border: '1px solid var(--mantine-color-default-border)',
                                    background: 'var(--mantine-color-default)',
                                }}
                            >
                                <Text size="sm">{t.emoji} {t.label}</Text>
                            </Box>
                        ))}
                    </Group>
                </Stack>
            </Container>

            {/* Features */}
            <Box py={80} style={{ background: 'var(--mantine-color-default-hover)' }}>
                <Container size="lg">
                    <Stack gap={60}>
                        <Stack align="center" gap="sm">
                            <Title order={2} ta="center" fw={800}>
                                어떻게 동작하나요?
                            </Title>
                            <Text c="dimmed" ta="center">
                                3단계만으로 전문가급 목업 이미지를 완성하세요.
                            </Text>
                        </Stack>

                        <Grid gutter="xl">
                            {features.map((f) => (
                                <Grid.Col key={f.title} span={{ base: 12, sm: 6, md: 3 }}>
                                    <Stack gap="md" align="center" ta="center">
                                        <ThemeIcon size={60} radius="xl" color={f.color} variant="light">
                                            <f.icon size={28} />
                                        </ThemeIcon>
                                        <Stack gap={4}>
                                            <Text fw={700} size="lg">{f.title}</Text>
                                            <Text c="dimmed" size="sm">{f.description}</Text>
                                        </Stack>
                                    </Stack>
                                </Grid.Col>
                            ))}
                        </Grid>
                    </Stack>
                </Container>
            </Box>

            {/* CTA */}
            <Container size="md" py={80}>
                <Stack align="center" gap="xl">
                    <Stack align="center" gap="sm">
                        <Title order={2} ta="center" fw={800}>
                            지금 바로 시작하세요
                        </Title>
                        <Text c="dimmed" ta="center">
                            가입 즉시 크레딧을 받아 무료로 목업을 생성해 보세요.
                            상품 이미지 하나로 8가지 목업 타입을 모두 시도할 수 있습니다.
                        </Text>
                    </Stack>
                    <Button
                        component={Link}
                        href="/dashboard"
                        size="xl"
                        color="violet"
                        radius="xl"
                        px={60}
                    >
                        무료로 목업 만들기
                    </Button>
                    <Text size="xs" c="dimmed">
                        1 generation = 30 credits · 신용카드 불필요
                    </Text>
                </Stack>
            </Container>

            {/* Footer */}
            <Box py="xl" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                <Container size="lg">
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            © 2026 amakers. All rights reserved.
                        </Text>
                        <Text size="sm" c="dimmed">
                            mockupbot — AI 상품 목업 생성 플랫폼
                        </Text>
                    </Group>
                </Container>
            </Box>
        </Box>
    );
}
