import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listAccounts } from '@/lib/instagram-account';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button, Alert } from '@mantine/core';
import { IconBrandInstagram, IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import { ComposeForm } from '@/components/ComposeForm';

export const dynamic = 'force-dynamic';

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/compose');

    const accounts = await listAccounts(userId);
    const options = accounts
        .filter((a) => a.status === 'ACTIVE')
        .map((a) => ({ value: a.id, label: `@${a.username}` }));

    const sp = await searchParams;
    // 달력에서 날짜 클릭 → 그 날 09:00 으로 예약 프리필
    const initialScheduledAt = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? `${sp.date}T09:00` : undefined;

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShellHeader>
                <Container size="lg" h="100%">
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
                <Container size="lg">
                    <Title order={2} mb={4}>새 게시물</Title>
                    <Text c="dimmed" size="sm" mb="lg">AI 이미지 생성 · 실시간 미리보기 · 최적 시간 예약</Text>
                    {options.length === 0 ? (
                        <Alert color="grape" variant="light" icon={<IconInfoCircle size={16} />}>
                            먼저 활성 인스타 계정을 연결하세요. <Anchor component="a" href="/dashboard/accounts">계정 연결 ↗</Anchor>
                        </Alert>
                    ) : (
                        <ComposeForm accounts={options} initialScheduledAt={initialScheduledAt} />
                    )}
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
