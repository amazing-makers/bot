import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listAccounts } from '@/lib/blog-account';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button, Alert } from '@mantine/core';
import { IconArticle, IconArrowLeft, IconInfoCircle } from '@tabler/icons-react';
import { ComposeForm } from '@/components/ComposeForm';

export const dynamic = 'force-dynamic';

export default async function ComposePage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/compose');

    const accounts = await listAccounts(userId);
    const options = accounts
        .filter((a) => a.status === 'ACTIVE')
        .map((a) => ({ value: a.id, label: a.siteUrl.replace(/^https?:\/\//, '') }));

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShellHeader>
                <Container size="md" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="lg" radius="md">
                                <IconArticle size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>BlogAuto</Title>
                            </Anchor>
                        </Group>
                        <Button component="a" href="/dashboard" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14} />}>
                            대시보드
                        </Button>
                    </Group>
                </Container>
            </AppShellHeader>

            <AppShellMain>
                <Container size="md">
                    <Title order={2} mb={4}>새 글 작성</Title>
                    <Text c="dimmed" size="sm" mb="lg">제목 + 본문(HTML/텍스트)으로 즉시 발행하거나 예약합니다.</Text>
                    {options.length === 0 ? (
                        <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
                            먼저 활성 블로그를 연결하세요. <Anchor component="a" href="/dashboard/accounts">블로그 연결 ↗</Anchor>
                        </Alert>
                    ) : (
                        <ComposeForm accounts={options} />
                    )}
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
