import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listAccounts } from '@/lib/instagram-account';
import { AppShell, Container, Title, Text, Group, ThemeIcon, Anchor, Button } from '@mantine/core';
import { IconBrandInstagram, IconArrowLeft } from '@tabler/icons-react';
import { AccountsManager } from '@/components/AccountsManager';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/accounts');

    const accounts = await listAccounts(userId);

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="md" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'grape', to: 'orange' }} size="lg" radius="md">
                                <IconBrandInstagram size={20} />
                            </ThemeIcon>
                            <Anchor component="a" href="/dashboard" underline="never" c="inherit">
                                <Title order={3}>instabot</Title>
                            </Anchor>
                        </Group>
                        <Button component="a" href="/dashboard" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14} />}>
                            대시보드
                        </Button>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="md">
                    <Title order={2} mb={4}>인스타 계정 연결</Title>
                    <Text c="dimmed" size="sm" mb="lg">
                        Business/Creator 계정 + Facebook Page 연결 후, Page Access Token 과 IG User ID 를 입력하세요.
                    </Text>
                    <AccountsManager initialAccounts={accounts} />
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
