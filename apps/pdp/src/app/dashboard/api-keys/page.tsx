import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
    AppShell, Container, Title, Text, Stack, Group, ThemeIcon, Anchor,
} from '@mantine/core';
import { IconWand, IconArrowLeft, IconKey } from '@tabler/icons-react';
import Link from 'next/link';
import { listUserApiKeys, ALL_PROVIDERS, type Provider } from '@/lib/api-keys';
import ApiKeysForm from '@/components/ApiKeysForm';

export const dynamic = 'force-dynamic';

const PROVIDER_INFO: Record<Provider, { label: string; description: string; signupUrl: string; keyPrefix: string; example: string }> = {
    openai: {
        label: 'OpenAI',
        description: 'GPT-4 Vision OCR (이미지 텍스트 추출)',
        signupUrl: 'https://platform.openai.com/api-keys',
        keyPrefix: 'sk-',
        example: 'sk-proj-...',
    },
    anthropic: {
        label: 'Anthropic Claude',
        description: '번역 / 상품 분석 / 페이지 outline 생성',
        signupUrl: 'https://console.anthropic.com/settings/keys',
        keyPrefix: 'sk-ant-',
        example: 'sk-ant-api03-...',
    },
    replicate: {
        label: 'Replicate',
        description: 'FLUX 1.1 Pro Fill (인페인팅) + FLUX 1.1 Pro (신규 이미지)',
        signupUrl: 'https://replicate.com/account/api-tokens',
        keyPrefix: 'r8_',
        example: 'r8_...',
    },
};

export default async function ApiKeysPage() {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login?callbackUrl=/dashboard/api-keys');

    const keys = await listUserApiKeys(userId);
    const keyMap = new Map<string, typeof keys[0]>();
    for (const k of keys) keyMap.set(k.provider, k);

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
                            <Group gap="xs">
                                <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size="lg" radius="md">
                                    <IconWand size={20} />
                                </ThemeIcon>
                                <Title order={3}>pdpbot</Title>
                            </Group>
                        </Anchor>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="md">
                    <Group mb="md">
                        <Anchor component={Link} href="/dashboard" size="sm">
                            <Group gap={4}><IconArrowLeft size={14} /> 대시보드</Group>
                        </Anchor>
                    </Group>

                    <Stack gap="lg">
                        <Stack gap={4}>
                            <Group gap="xs">
                                <ThemeIcon variant="gradient" gradient={{ from: 'teal', to: 'cyan' }} size="lg" radius="md">
                                    <IconKey size={20} />
                                </ThemeIcon>
                                <Title order={2}>BYOK — 내 API 키 사용</Title>
                            </Group>
                            <Text size="sm" c="dimmed">
                                OpenAI / Anthropic / Replicate 키를 직접 입력하면 해당 호출은 <strong>credit 차감 0</strong> —
                                사용자가 프로바이더에 직접 결제. 키 없으면 운영자 키 사용 + 정상 credit 차감.
                                헤비 유저 (월 1000+ 상품) 의 비용 절감 옵션.
                            </Text>
                            <Text size="xs" c="orange">
                                ⚠️ 키는 AES-256-GCM 암호화 후 저장 — plaintext 노출 X. 단, 본인 PC 처럼 안전한 환경에서 입력하세요.
                            </Text>
                        </Stack>

                        <ApiKeysForm
                            providers={ALL_PROVIDERS as Provider[]}
                            providerInfo={PROVIDER_INFO}
                            initialKeys={keys.map(k => ({
                                provider: k.provider as Provider,
                                maskedHint: k.maskedHint,
                                lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null,
                            }))}
                        />
                    </Stack>
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
