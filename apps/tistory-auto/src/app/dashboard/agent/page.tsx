import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/auth';
import { getOrCreateAgentToken } from '@/lib/agent-token';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button } from '@mantine/core';
import { IconArticle, IconArrowLeft } from '@tabler/icons-react';
import { AgentTokenPanel } from '@/components/AgentTokenPanel';

export const dynamic = 'force-dynamic';

export default async function AgentPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/agent');

    const token = await getOrCreateAgentToken(userId);

    const h = await headers();
    const host = h.get('host') || 'localhost:3700';
    const proto = host.startsWith('localhost') ? 'http' : 'https';
    const baseUrl = `${proto}://${host}`;

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
                    <Title order={2} mb={4}>에이전트</Title>
                    <Text c="dimmed" size="sm" mb="lg">데스크톱 에이전트가 발행 큐를 처리하도록 토큰을 발급·연동합니다.</Text>
                    <AgentTokenPanel initialToken={token} baseUrl={baseUrl} />
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
