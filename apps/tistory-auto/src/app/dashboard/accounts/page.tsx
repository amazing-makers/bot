import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listAccounts } from '@/lib/tistory-account';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button } from '@mantine/core';
import { IconArticle, IconArrowLeft } from '@tabler/icons-react';
import { AccountsManager } from '@/components/AccountsManager';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/accounts');

    const accounts = await listAccounts(userId);

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShellHeader>
                <Container size="md" h="100%">
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
                <Container size="md">
                    <Title order={2} mb={4}>티스토리 블로그 등록</Title>
                    <Text c="dimmed" size="sm" mb="lg">
                        블로그 주소(예: myblog.tistory.com)를 등록하세요. 자동 발행은 에이전트 연동(Phase 2) 후 활성화됩니다.
                    </Text>
                    <AccountsManager initialAccounts={accounts} />
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
