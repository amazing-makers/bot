'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AppShell, Container, Group, ThemeIcon, Title, Anchor, Box, TextInput, Button } from '@mantine/core';
import { IconBrush, IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type Konva from 'konva';
import { useEditorStore } from '@/lib/design/store';
import type { Scene } from '@/lib/design/types';
import Toolbar from './Toolbar';
import LayersPanel from './LayersPanel';
import PropertyPanel from './PropertyPanel';

// react-konva 는 'canvas' module 을 SSR 시 require — Next.js 에서 dynamic + ssr:false 필수.
const Canvas = dynamic(() => import('./Canvas'), { ssr: false });

export default function EditorShell({
    designId,
    initialTitle,
    initialScene,
}: {
    designId: string;
    initialTitle?: string | null;
    initialScene: Scene;
}) {
    const router = useRouter();
    const [title, setTitle] = useState(initialTitle || '제목 없음');
    const [saving, setSaving] = useState(false);
    const stageRef = useRef<Konva.Stage | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const scene = useEditorStore(s => s.scene);
    const loadScene = useEditorStore(s => s.loadScene);
    const addImageElement = useEditorStore(s => s.addImageElement);

    // 진입 시 store 에 scene load
    useEffect(() => {
        loadScene(initialScene);
    }, [initialScene, loadScene]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const r = await fetch(`/api/designs/${designId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, scene }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '저장 실패');
            notifications.show({ title: '✅ 저장됨', message: title, color: 'teal', autoClose: 1500 });
        } catch (e: any) {
            notifications.show({ title: '저장 실패', message: e?.message || '오류', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        const stage = stageRef.current;
        if (!stage) return;
        // 줌과 무관하게 원본 사이즈로 export — scale 1 로 복제 또는 pixelRatio 사용
        const dataUrl = stage.toDataURL({
            mimeType: 'image/png',
            pixelRatio: 1 / (stage.scaleX() || 1),
            quality: 1,
        });

        // 다운로드
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${title.replace(/[^\w가-힯-]/g, '-')}.png`;
        a.click();

        // 동시에 서버에 thumbnail 로 저장
        try {
            await fetch(`/api/designs/${designId}/thumbnail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataUrl }),
            });
        } catch { /* thumbnail 저장 실패해도 export 는 성공 */ }

        notifications.show({ title: '📥 PNG 다운로드', message: '브라우저 다운로드 폴더 확인', color: 'teal' });
    };

    const handleUploadImage = () => {
        fileInputRef.current?.click();
    };

    const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const src = reader.result as string;
            const img = new window.Image();
            img.onload = () => {
                const max = 600;
                const ratio = Math.min(max / img.width, max / img.height, 1);
                addImageElement(src, { width: img.width * ratio, height: img.height * ratio });
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    return (
        <AppShell header={{ height: 56 }} padding={0}>
            <AppShell.Header>
                <Container size="100%" h="100%" p={0}>
                    <Group h="100%" justify="space-between" px="md" wrap="nowrap">
                        <Group gap="xs" wrap="nowrap">
                            <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
                                <Group gap="xs">
                                    <ThemeIcon variant="gradient" gradient={{ from: 'pink', to: 'orange' }} size="md" radius="md">
                                        <IconBrush size={18} />
                                    </ThemeIcon>
                                    <Title order={4}>designbot</Title>
                                </Group>
                            </Anchor>
                            <Button component={Link} href="/dashboard" variant="subtle" size="xs" leftSection={<IconArrowLeft size={14} />}>
                                대시보드
                            </Button>
                        </Group>
                        <TextInput
                            value={title}
                            onChange={(e) => setTitle(e.currentTarget.value)}
                            size="sm"
                            style={{ flex: 1, maxWidth: 400 }}
                            variant="filled"
                        />
                        <Button leftSection={<IconDeviceFloppy size={14} />} onClick={handleSave} loading={saving} variant="light">
                            저장
                        </Button>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Box style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
                    <Toolbar onExport={handleExport} onUploadImage={handleUploadImage} />
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onFileSelected} />

                    <Box style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 0, minHeight: 0 }}>
                        <Box style={{ minHeight: 0 }}>
                            <Canvas stageRef={stageRef} />
                        </Box>
                        <Box style={{ borderLeft: '1px solid var(--mantine-color-default-border)', padding: 12, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                            <Box style={{ flex: '0 0 240px', minHeight: 0 }}>
                                <LayersPanel />
                            </Box>
                            <Box style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                                <PropertyPanel />
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </AppShell.Main>
        </AppShell>
    );
}
