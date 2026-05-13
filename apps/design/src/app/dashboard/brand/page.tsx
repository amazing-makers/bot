import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    AppShell, Container, Title, Text, Stack, Group, ThemeIcon, Anchor,
} from '@mantine/core';
import { IconBrush, IconArrowLeft, IconPalette } from '@tabler/icons-react';
import Link from 'next/link';
import BrandKitsManager from '@/components/brand/BrandKitsManager';

export const dynamic = 'force-dynamic';

export default async function BrandPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/brand');

    const kits = await (prisma as any).brandKit.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%">
                        <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
                            <Group gap="xs">
                                <ThemeIcon variant="gradient" gradient={{ from: 'pink', to: 'orange' }} size="lg" radius="md">
                                    <IconBrush size={20} />
                                </ThemeIcon>
                                <Title order={3}>designbot</Title>
                            </Group>
                        </Anchor>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="md">
                    <Group mb="md">
                        <Anchor component={Link} href="/dashboard" size="sm">
                            <Group gap={4}><IconArrowLeft size={14} /> 대시보드</Group>
                        </Anchor>
                    </Group>

                    <Stack gap="lg">
                        <Stack gap={4}>
                            <Group gap="xs">
                                <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'cyan' }} size="lg" radius="md">
                                    <IconPalette size={20} />
                                </ThemeIcon>
                                <Title order={2}>브랜드 키트</Title>
                            </Group>
                            <Text size="sm" c="dimmed">
                                브랜드 색상·로고를 저장해두면 AI 디자인 생성 시 자동 반영. 일관된 톤 유지.
                            </Text>
                        </Stack>

                        <BrandKitsManager
                            initialKits={kits.map((k: any) => ({
                                id: k.id,
                                name: k.name,
                                colors: k.colors,
                                logoUrl: k.logoUrl,
                                fontFamily: k.fontFamily,
                                isDefault: k.isDefault,
                            }))}
                        />
                    </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
