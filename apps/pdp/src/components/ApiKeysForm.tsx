'use client';

import { useState } from 'react';
import {
    Stack, Group, Card, Badge, Button, Text, TextInput, ThemeIcon, Anchor, Box,
} from '@mantine/core';
import { IconCheck, IconKey, IconExternalLink, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

type Provider = 'openai' | 'anthropic' | 'replicate';

interface ProviderInfo {
    label: string;
    description: string;
    signupUrl: string;
    keyPrefix: string;
    example: string;
}

interface KeyState {
    provider: Provider;
    maskedHint: string;
    lastUsedAt: string | null;
}

export default function ApiKeysForm({
    providers,
    providerInfo,
    initialKeys,
}: {
    providers: Provider[];
    providerInfo: Record<Provider, ProviderInfo>;
    initialKeys: KeyState[];
}) {
    const router = useRouter();
    const initialMap = new Map(initialKeys.map(k => [k.provider, k]));

    const [keys, setKeys] = useState<Map<Provider, KeyState>>(initialMap);
    const [inputs, setInputs] = useState<Record<Provider, string>>({
        openai: '', anthropic: '', replicate: '',
    });
    const [loading, setLoading] = useState<Record<Provider, boolean>>({
        openai: false, anthropic: false, replicate: false,
    });

    const handleSave = async (provider: Provider) => {
        const key = inputs[provider]?.trim();
        if (!key) {
            notifications.show({ message: 'API 키를 입력하세요', color: 'red' });
            return;
        }
        setLoading(prev => ({ ...prev, [provider]: true }));
        try {
            const r = await fetch('/api/user/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, key }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '저장 실패');

            setKeys(prev => {
                const next = new Map(prev);
                next.set(provider, {
                    provider,
                    maskedHint: data.maskedHint,
                    lastUsedAt: null,
                });
                return next;
            });
            setInputs(prev => ({ ...prev, [provider]: '' }));
            notifications.show({
                title: '✨ BYOK 활성화',
                message: `${providerInfo[provider].label} 키 저장 완료. 이제 ${providerInfo[provider].label} 호출은 credit 차감 0.`,
                color: 'teal',
            });
            router.refresh();
        } catch (e: any) {
            notifications.show({ title: '저장 실패', message: e?.message || '오류', color: 'red' });
        } finally {
            setLoading(prev => ({ ...prev, [provider]: false }));
        }
    };

    const handleDelete = async (provider: Provider) => {
        if (!confirm(`${providerInfo[provider].label} 키를 삭제하시겠습니까? 이후 호출은 운영자 키 + credit 차감으로 동작합니다.`)) return;

        setLoading(prev => ({ ...prev, [provider]: true }));
        try {
            const r = await fetch(`/api/user/api-keys?provider=${provider}`, { method: 'DELETE' });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '삭제 실패');

            setKeys(prev => {
                const next = new Map(prev);
                next.delete(provider);
                return next;
            });
            notifications.show({ message: `${providerInfo[provider].label} 키 삭제됨`, color: 'gray' });
            router.refresh();
        } catch (e: any) {
            notifications.show({ title: '삭제 실패', message: e?.message || '오류', color: 'red' });
        } finally {
            setLoading(prev => ({ ...prev, [provider]: false }));
        }
    };

    return (
        <Stack gap="md">
            {providers.map(provider => {
                const info = providerInfo[provider];
                const current = keys.get(provider);
                const isActive = !!current;

                return (
                    <Card key={provider} withBorder p="md" radius="md">
                        <Group justify="space-between" mb="xs">
                            <Group gap="xs">
                                <ThemeIcon
                                    variant="light"
                                    color={isActive ? 'teal' : 'gray'}
                                    size="md"
                                >
                                    <IconKey size={16} />
                                </ThemeIcon>
                                <Text fw={700}>{info.label}</Text>
                                {isActive && (
                                    <Badge variant="filled" color="teal" leftSection={<IconCheck size={10} />}>
                                        BYOK 활성
                                    </Badge>
                                )}
                            </Group>
                            <Anchor href={info.signupUrl} target="_blank" rel="noreferrer" size="xs">
                                <Group gap={4}>
                                    키 발급 <IconExternalLink size={11} />
                                </Group>
                            </Anchor>
                        </Group>

                        <Text size="xs" c="dimmed" mb="xs">
                            {info.description}
                        </Text>

                        {isActive ? (
                            <Box>
                                <Group justify="space-between">
                                    <Text size="sm" ff="monospace" c="dimmed">
                                        {current.maskedHint}
                                    </Text>
                                    <Button
                                        size="xs"
                                        color="red"
                                        variant="light"
                                        loading={loading[provider]}
                                        leftSection={<IconTrash size={12} />}
                                        onClick={() => handleDelete(provider)}
                                    >
                                        삭제 (운영자 키로 복귀)
                                    </Button>
                                </Group>
                                {current.lastUsedAt && (
                                    <Text size="xs" c="dimmed" mt={4}>
                                        마지막 사용: {new Date(current.lastUsedAt).toLocaleString('ko-KR')}
                                    </Text>
                                )}
                            </Box>
                        ) : (
                            <Group gap="xs" align="flex-end">
                                <TextInput
                                    placeholder={info.example}
                                    value={inputs[provider]}
                                    onChange={e => setInputs(prev => ({ ...prev, [provider]: e.currentTarget.value }))}
                                    style={{ flex: 1 }}
                                    type="password"
                                />
                                <Button
                                    onClick={() => handleSave(provider)}
                                    loading={loading[provider]}
                                    color="teal"
                                >
                                    저장
                                </Button>
                            </Group>
                        )}
                    </Card>
                );
            })}
        </Stack>
    );
}
