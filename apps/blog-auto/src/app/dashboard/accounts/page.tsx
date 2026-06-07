import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listAccounts } from '@/lib/blog-account';
import { getOrCreateAgentToken } from '@/lib/agent-token';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button, Stack, Divider } from '@mantine/core';
import { IconArticle, IconArrowLeft } from '@tabler/icons-react';
import { AccountsManager } from '@/components/AccountsManager';
import { NaverConnect } from '@/components/NaverConnect';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/accounts');

    const accounts = await listAccounts(userId);
    const naverToken = await getOrCreateAgentToken(userId);

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
                                <Title order={3}>NaverBlogAuto</Title>
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
                        워드프레스는 API로 바로 발행, 네이버는 데스크톱 에이전트로 자동 발행합니다.
                    </Text>
                    <Stack>
                        <NaverConnect initialToken={naverToken} />
                        <Divider label="워드프레스 (API)" labelPosition="left" />
                        <AccountsManager initialAccounts={accounts} />
                    </Stack>
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
