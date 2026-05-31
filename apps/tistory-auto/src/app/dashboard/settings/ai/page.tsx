import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listUserApiKeys } from '@/lib/api-keys';
import { AppShell, AppShellHeader, AppShellMain, Container, Title, Text, Group, ThemeIcon, Anchor, Button } from '@mantine/core';
import { IconArticle, IconArrowLeft } from '@tabler/icons-react';
import { ApiKeysForm } from '@/components/ApiKeysForm';

export const dynamic = 'force-dynamic';

export default async function AiSettingsPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/settings/ai');

    const keys = await listUserApiKeys(userId);

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
                    <Title order={2} mb={4}>AI 설정 (BYOK)</Title>
                    <Text c="dimmed" size="sm" mb="lg">무료 AI 키를 등록하면 글 작성 시 제목·본문·이미지를 자동 생성할 수 있습니다.</Text>
                    <ApiKeysForm initialKeys={keys} />
                </Container>
            </AppShellMain>
        </AppShell>
    );
}
