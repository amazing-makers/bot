'use client';

import { useState } from 'react';
import { Group, Button, Menu, Text, Box } from '@mantine/core';
import { IconPlus, IconChevronDown } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import type { CanvasPreset } from '@/lib/design/types';

export default function NewDesignButtons({ presets }: { presets: CanvasPreset[] }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleCreate = async (templateKey?: string, title?: string) => {
        setLoading(true);
        try {
            const r = await fetch('/api/designs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateKey, title }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '생성 실패');
            router.push(`/editor/${data.designId}`);
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '오류', color: 'red' });
            setLoading(false);
        }
    };

    return (
        <Group gap="xs" wrap="wrap">
            {presets.map(p => (
                <Button
                    key={p.key}
                    size="sm"
                    variant="light"
                    loading={loading}
                    onClick={() => handleCreate(p.key)}
                >
                    <Box ta="left">
                        <Text size="sm" fw={700}>{p.label}</Text>
                        <Text size="11px" c="dimmed">{p.width}×{p.height}</Text>
                    </Box>
                </Button>
            ))}
            <Menu>
                <Menu.Target>
                    <Button size="sm" variant="filled" color="pink" leftSection={<IconPlus size={14} />} rightSection={<IconChevronDown size={12} />}>
                        새로 만들기
                    </Button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Label>한국 셀러 표준 사이즈</Menu.Label>
                    {presets.map(p => (
                        <Menu.Item key={p.key} onClick={() => handleCreate(p.key)}>
                            <Text size="sm">{p.label}</Text>
                            <Text size="11px" c="dimmed">{p.description}</Text>
                        </Menu.Item>
                    ))}
                    <Menu.Divider />
                    <Menu.Item onClick={() => handleCreate(undefined, '빈 디자인')}>
                        빈 캔버스 (1080×1080)
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Group>
    );
}
