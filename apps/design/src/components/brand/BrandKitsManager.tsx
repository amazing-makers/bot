'use client';

import { useState } from 'react';
import {
    Stack, Group, Card, Badge, Button, Text, TextInput, ColorInput, ActionIcon, Box, Paper, SimpleGrid, Tooltip,
} from '@mantine/core';
import { IconPlus, IconTrash, IconCheck, IconStar, IconStarFilled } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

interface KitState {
    id: string;
    name: string;
    colors: string[];
    logoUrl?: string | null;
    fontFamily?: string | null;
    isDefault: boolean;
}

export default function BrandKitsManager({ initialKits }: { initialKits: KitState[] }) {
    const router = useRouter();
    const [kits, setKits] = useState<KitState[]>(initialKits);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColors, setNewColors] = useState<string[]>(['#7c3aed']);
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!newName.trim()) {
            notifications.show({ message: '키트 이름 입력', color: 'orange' });
            return;
        }
        setSaving(true);
        try {
            const r = await fetch('/api/brand-kits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName.trim(),
                    colors: newColors.filter(c => /^#[0-9a-f]{6}$/i.test(c)),
                    isDefault: kits.length === 0,
                }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '생성 실패');
            setKits(prev => [data.kit, ...prev]);
            setAdding(false);
            setNewName('');
            setNewColors(['#7c3aed']);
            notifications.show({ message: '브랜드 키트 추가됨', color: 'teal' });
            router.refresh();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '오류', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('이 브랜드 키트를 삭제하시겠습니까?')) return;
        try {
            const r = await fetch(`/api/brand-kits/${id}`, { method: 'DELETE' });
            if (!r.ok) throw new Error('삭제 실패');
            setKits(prev => prev.filter(k => k.id !== id));
            router.refresh();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '오류', color: 'red' });
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            const r = await fetch(`/api/brand-kits/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isDefault: true }),
            });
            if (!r.ok) throw new Error('수정 실패');
            setKits(prev => prev.map(k => ({ ...k, isDefault: k.id === id })));
            router.refresh();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '오류', color: 'red' });
        }
    };

    const addColorSlot = () => {
        if (newColors.length >= 5) return;
        setNewColors([...newColors, '#cccccc']);
    };

    const updateColor = (idx: number, val: string) => {
        setNewColors(prev => prev.map((c, i) => i === idx ? val : c));
    };

    const removeColor = (idx: number) => {
        if (newColors.length <= 1) return;
        setNewColors(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <Stack gap="md">
            {kits.length > 0 && (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    {kits.map(kit => (
                        <Card key={kit.id} withBorder p="md" radius="md">
                            <Group justify="space-between" mb="xs">
                                <Group gap="xs">
                                    <Text fw={700}>{kit.name}</Text>
                                    {kit.isDefault && <Badge size="xs" variant="filled" color="violet">기본</Badge>}
                                </Group>
                                <Group gap={4}>
                                    <Tooltip label={kit.isDefault ? '기본 키트' : '기본으로 설정'}>
                                        <ActionIcon
                                            size="sm" variant="subtle"
                                            color={kit.isDefault ? 'violet' : 'gray'}
                                            onClick={() => !kit.isDefault && handleSetDefault(kit.id)}
                                        >
                                            {kit.isDefault ? <IconStarFilled size={14} /> : <IconStar size={14} />}
                                        </ActionIcon>
                                    </Tooltip>
                                    <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleDelete(kit.id)}>
                                        <IconTrash size={14} />
                                    </ActionIcon>
                                </Group>
                            </Group>
                            <Group gap={4}>
                                {kit.colors.map((c, i) => (
                                    <Box key={i} title={c} style={{
                                        width: 32, height: 32, borderRadius: 6, background: c,
                                        border: '1px solid var(--mantine-color-default-border)',
                                    }} />
                                ))}
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>
            )}

            {adding ? (
                <Paper withBorder p="md" radius="md">
                    <Stack gap="sm">
                        <TextInput label="키트 이름" placeholder="예: 본업 셀러"
                            value={newName} onChange={(e) => setNewName(e.currentTarget.value)} />
                        <Box>
                            <Text size="sm" fw={600} mb={4}>색상 ({newColors.length}/5)</Text>
                            <Stack gap={6}>
                                {newColors.map((c, i) => (
                                    <Group key={i} gap="xs" wrap="nowrap">
                                        <ColorInput value={c} onChange={(v) => updateColor(i, v)} format="hex" style={{ flex: 1 }} />
                                        <ActionIcon variant="subtle" color="red" disabled={newColors.length <= 1} onClick={() => removeColor(i)}>
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>
                                ))}
                                {newColors.length < 5 && (
                                    <Button variant="subtle" size="xs" leftSection={<IconPlus size={12} />} onClick={addColorSlot}>
                                        색 추가
                                    </Button>
                                )}
                            </Stack>
                        </Box>
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={() => setAdding(false)}>취소</Button>
                            <Button color="violet" loading={saving} leftSection={<IconCheck size={14} />} onClick={handleAdd}>
                                저장
                            </Button>
                        </Group>
                    </Stack>
                </Paper>
            ) : (
                <Button color="violet" variant="light" leftSection={<IconPlus size={14} />} onClick={() => setAdding(true)}>
                    새 브랜드 키트
                </Button>
            )}

            {kits.length === 0 && !adding && (
                <Paper withBorder p="xl" radius="md" ta="center">
                    <Text size="sm" c="dimmed">
                        아직 브랜드 키트가 없습니다. 첫 키트를 만들면 AI 디자인 생성 시 자동 반영됩니다.
                    </Text>
                </Paper>
            )}
        </Stack>
    );
}
