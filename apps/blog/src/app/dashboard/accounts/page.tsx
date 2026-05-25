import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listAccounts } from '@/lib/blog-account';
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
                            <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size="lg" radius="md">
                                <IconArticle size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>blogbot</Title>
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
                    <Title order={2} mb={4}>블로그 연결</Title>
                    <Text c="dimmed" size="sm" mb="lg">
                        WordPress 사이트 URL · username · Application Password 를 입력하세요. (네이버블로그는 준비 중)
                    </Text>
                    <AccountsManager initialAccounts={accounts} />
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
