import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listAccounts } from '@/lib/instagram-account';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button, Alert } from '@mantine/core';
import { IconBrandInstagram, IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import { ComposeForm } from '@/components/ComposeForm';

export const dynamic = 'force-dynamic';

export default async function ComposePage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/compose');

    const accounts = await listAccounts(userId);
    const options = accounts
        .filter((a) => a.status === 'ACTIVE')
        .map((a) => ({ value: a.id, label: `@${a.username}` }));

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShellHeader>
                <Container size="sm" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'grape', to: 'orange' }} size="lg" radius="md">
                                <IconBrandInstagram size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>InstaAuto</Title>
                            </Anchor>
                        </Group>
                        <Button component="a" href="/dashboard" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14} />}>
                            대시보드
                        </Button>
                    </Group>
                </Container>
            </AppShellHeader>

            <AppShellMain>
                <Container size="sm">
                    <Title order={2} mb={4}>새 게시물</Title>
                    <Text c="dimmed" size="sm" mb="lg">캡션 + public 이미지 URL 로 즉시 발행하거나 예약합니다.</Text>
                    {options.length === 0 ? (
                        <Alert color="grape" variant="light" icon={<IconInfoCircle size={16} />}>
                            먼저 활성 인스타 계정을 연결하세요. <Anchor component="a" href="/dashboard/accounts">계정 연결 ↗</Anchor>
                        </Alert>
                    ) : (
                        <ComposeForm accounts={options} />
                    )}
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
