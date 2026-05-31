'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Stack, Group, Text, Badge, Button, PasswordInput, Anchor, Alert } from '@mantine/core';
import { IconKey, IconTrash, IconCheck, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { saveApiKeyAction, deleteApiKeyAction } from '@/app/actions/ai';

interface KeyRow { provider: string; maskedHint: string; lastUsedAt: Date | null; updatedAt: Date }

const PROVIDERS = [
    { id: 'gemini', name: 'Google Gemini', help: 'aistudio.google.com/app/apikey', desc: '무료 티어 — 글/이미지 생성용' },
    { id: 'groq', name: 'Groq', help: 'console.groq.com/keys', desc: '무료 티어 — 빠른 글 생성' },
];

export function ApiKeysForm({ initialKeys }: { initialKeys: KeyRow[] }) {
    const router = useRouter();
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [pending, startTransition] = useTransition();

    const registered = new Map(initialKeys.map((k) => [k.provider, k.maskedHint]));

    const save = (provider: string) => {
        const key = (inputs[provider] || '').trim();
        if (!key) return;
        startTransition(async () => {
            const r = await saveApiKeyAction(provider, key);
            if (r.ok) {
                notifications.show({ title: '키 저장', message: `${provider} 키가 검증·저장되었습니다 (${r.maskedHint})`, color: 'teal' });
                setInputs((s) => ({ ...s, [provider]: '' }));
                router.refresh();
            } else {
                notifications.show({ title: '저장 실패', message: r.error || '오류', color: 'red' });
            }
        });
    };

    const remove = (provider: string) => {
        startTransition(async () => {
            await deleteApiKeyAction(provider);
            notifications.show({ title: '키 삭제', message: `${provider} 키를 삭제했습니다`, color: 'gray' });
            router.refresh();
        });
    };

    return (
        <Stack gap="md">
            <Alert variant="light" color="orange" icon={<IconInfoCircle size={16} />}>
                <Text size="sm">
                    AI 글/이미지 생성을 쓰려면 <strong>무료 API 키</strong> 하나를 등록하세요. 키는 AES-256-GCM 으로 암호화 저장되며,
                    인스타·블로그·허브 등 <strong>모든 도구가 같은 키를 공유</strong>합니다. (Gemini 우선, 없으면 Groq)
                </Text>
            </Alert>

            {PROVIDERS.map((p) => {
                const mask = registered.get(p.id);
                return (
                    <Card key={p.id} withBorder p="md" radius="md">
                        <Group justify="space-between" mb="xs">
                            <Group gap="xs">
                                <IconKey size={16} />
                                <Text fw={700}>{p.name}</Text>
                                {mask && <Badge size="xs" color="teal" variant="light" leftSection={<IconCheck size={10} />}>{mask}</Badge>}
                            </Group>
                            <Anchor href={`https://${p.help}`} target="_blank" rel="noreferrer" size="xs">무료 키 발급 ↗</Anchor>
                        </Group>
                        <Text size="xs" c="dimmed" mb="xs">{p.desc}</Text>
                        <Group gap="xs" align="flex-end">
                            <PasswordInput
                                style={{ flex: 1 }}
                                placeholder={mask ? '새 키로 교체하려면 입력' : '키 붙여넣기'}
                                value={inputs[p.id] || ''}
                                onChange={(e) => setInputs((s) => ({ ...s, [p.id]: e.currentTarget.value }))}
                            />
                            <Button color="orange" loading={pending} onClick={() => save(p.id)} disabled={!(inputs[p.id] || '').trim()}>저장</Button>
                            {mask && <Button variant="subtle" color="red" loading={pending} leftSection={<IconTrash size={14} />} onClick={() => remove(p.id)}>삭제</Button>}
                        </Group>
                    </Card>
                );
            })}
        </Stack>
    );
}
