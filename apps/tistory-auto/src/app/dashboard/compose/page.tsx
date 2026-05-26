import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listAccounts } from '@/lib/tistory-account';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button, Alert } from '@mantine/core';
import { IconArticle, IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import { ComposeForm } from '@/components/ComposeForm';

export const dynamic = 'force-dynamic';

export default async function ComposePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/compose');

    const accounts = await listAccounts(userId);
    const options = accounts
        .filter((a) => a.status === 'ACTIVE')
        .map((a) => ({ value: a.id, label: a.siteUrl }));

    const sp = await searchParams;
    const initialScheduledAt = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? `${sp.date}T09:00` : undefined;

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShellHeader>
                <Container size="lg" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'orange', to: 'red' }} size="lg" radius="md">
                                <IconArticle size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>TistoryAuto</Title>
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
                    <Title order={2} mb={4}>새 글 작성</Title>
                    <Text c="dimmed" size="sm" mb="lg">AI 대표 이미지 · 미리보기 · 최적 시간 예약 (발행은 에이전트 Phase 2)</Text>
                    {options.length === 0 ? (
                        <Alert color="orange" variant="light" icon={<IconInfoCircle size={16} />}>
                            먼저 티스토리 블로그를 등록하세요. <Anchor component="a" href="/dashboard/accounts">블로그 등록 ↗</Anchor>
                        </Alert>
                    ) : (
                        <ComposeForm accounts={options} initialScheduledAt={initialScheduledAt} />
                    )}
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
