import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getBalance } from '@/lib/credit';
import {
    Box,
    Button,
    Container,
    Grid,
    Group,
    Image,
    Stack,
    Text,
    Badge,
    Title,
    Card,
    ThemeIcon,
} from '@mantine/core';
import {
    IconPlus,
    IconPhoto,
    IconCoin,
    IconLogout,
} from '@tabler/icons-react';
import Link from 'next/link';
import { MockupCreator } from '@/components/MockupCreator';

const STATUS_COLOR: Record<string, string> = {
    pending: 'gray',
    generating: 'yellow',
    done: 'green',
    failed: 'red',
};

const STATUS_LABEL: Record<string, string> = {
    pending: '대기중',
    generating: '생성중',
    done: '완료',
    failed: '실패',
};

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }

    const userId = (session.user as any).id as string;

    const [mockups, balance] = await Promise.all([
        (prisma as any).mockup.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                id: true,
                title: true,
                mockupType: true,
                productImageUrl: true,
                outputUrl: true,
                status: true,
                creditsUsed: true,
                createdAt: true,
            },
        }),
        getBalance(userId),
    ]);

    return (
        <Box>
            {/* Header */}
            <Box
                py="md"
                px="xl"
                style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
                <Group justify="space-between" maw={1200} mx="auto">
                    <Group gap="xs">
                        <Text fw={800} size="xl" c="violet">mockupbot</Text>
                    </Group>
                    <Group gap="md">
                        <Group gap={6}>
                            <ThemeIcon size={20} variant="light" color="yellow" radius="xl">
                                <IconCoin size={12} />
                            </ThemeIcon>
                            <Text size="sm" fw={600}>{balance.toLocaleString()} 크레딧</Text>
                        </Group>
                        <Text size="sm" c="dimmed">{session.user.email}</Text>
                        <Button
                            component={Link}
                            href="/api/auth/signout"
                            variant="subtle"
                            size="xs"
                            leftSection={<IconLogout size={14} />}
                        >
                            로그아웃
                        </Button>
                    </Group>
                </Group>
            </Box>

            <Container size="xl" py="xl">
                <Grid gutter="xl">
                    {/* Left: MockupCreator */}
                    <Grid.Col span={{ base: 12, md: 5 }}>
                        <Stack gap="md">
                            <Title order={3} fw={700}>새 목업 만들기</Title>
                            <MockupCreator />
                        </Stack>
                    </Grid.Col>

                    {/* Right: Gallery */}
                    <Grid.Col span={{ base: 12, md: 7 }}>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Title order={3} fw={700}>내 목업 갤러리</Title>
                                <Text size="sm" c="dimmed">{mockups.length}개</Text>
                            </Group>

                            {mockups.length === 0 ? (
                                <Card withBorder p="xl" radius="md">
                                    <Stack align="center" gap="md" py="xl">
                                        <ThemeIcon size={60} variant="light" color="violet" radius="xl">
                                            <IconPhoto size={28} />
                                        </ThemeIcon>
                                        <Stack align="center" gap={4}>
                                            <Text fw={600}>아직 생성된 목업이 없습니다</Text>
                                            <Text size="sm" c="dimmed">
                                                왼쪽에서 상품 이미지를 업로드하고 목업을 생성해 보세요!
                                            </Text>
                                        </Stack>
                                    </Stack>
                                </Card>
                            ) : (
                                <Grid gutter="md">
                                    {mockups.map((m: any) => (
                                        <Grid.Col key={m.id} span={{ base: 12, xs: 6, lg: 4 }}>
                                            <Card withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                                                <Box style={{ aspectRatio: '1', position: 'relative', background: 'var(--mantine-color-default-hover)' }}>
                                                    {m.outputUrl ? (
                                                        <Image
                                                            src={m.outputUrl}
                                                            alt={m.title || m.mockupType}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <Stack align="center" justify="center" h="100%" gap={4}>
                                                            <IconPhoto size={32} color="var(--mantine-color-dimmed)" />
                                                            <Text size="xs" c="dimmed">
                                                                {STATUS_LABEL[m.status] || m.status}
                                                            </Text>
                                                        </Stack>
                                                    )}
                                                </Box>
                                                <Box p="sm">
                                                    <Group justify="space-between" align="flex-start">
                                                        <Stack gap={2}>
                                                            <Text size="sm" fw={600} lineClamp={1}>
                                                                {m.title || m.mockupType}
                                                            </Text>
                                                            <Text size="xs" c="dimmed">
                                                                {new Date(m.createdAt).toLocaleDateString('ko-KR')}
                                                            </Text>
                                                        </Stack>
                                                        <Badge
                                                            size="xs"
                                                            color={STATUS_COLOR[m.status] || 'gray'}
                                                            variant="light"
                                                        >
                                                            {STATUS_LABEL[m.status] || m.status}
                                                        </Badge>
                                                    </Group>
                                                    {m.outputUrl && (
                                                        <Button
                                                            component="a"
                                                            href={m.outputUrl}
                                                            download
                                                            size="xs"
                                                            variant="light"
                                                            fullWidth
                                                            mt="xs"
                                                        >
                                                            다운로드
                                                        </Button>
                                                    )}
                                                </Box>
                                            </Card>
                                        </Grid.Col>
                                    ))}
                                </Grid>
                            )}
                        </Stack>
                    </Grid.Col>
                </Grid>
            </Container>
        </Box>
    );
}
