'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AppShell, Container, Group, ThemeIcon, Title, Anchor, Box, TextInput, Button, Menu, ActionIcon } from '@mantine/core';
import { IconBrush, IconArrowLeft, IconDeviceFloppy, IconSparkles, IconBookmark, IconDownload, IconShare, IconDots } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type Konva from 'konva';
import { useEditorStore } from '@/lib/design/store';
import type { Scene } from '@/lib/design/types';
import Toolbar from './Toolbar';
import LayersPanel from './LayersPanel';
import PropertyPanel from './PropertyPanel';
import AiGenerateModal from './AiGenerateModal';
import SaveTemplateModal from './SaveTemplateModal';

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
    const [aiOpen, setAiOpen] = useState(false);
    const [templateOpen, setTemplateOpen] = useState(false);
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

        // 동시에 서버에 thumbnail 로 저장 + R2 URL 캐시
        try {
            const r = await fetch(`/api/designs/${designId}/thumbnail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataUrl }),
            });
            const data = await r.json();
            if (data?.url) {
                (window as any).__lastExportUrl = data.url;
            }
        } catch { /* thumbnail 저장 실패해도 export 는 성공 */ }

        notifications.show({ title: '📥 PNG 다운로드', message: '브라우저 다운로드 폴더 확인', color: 'teal' });
    };

    /** PNG URL 복사 (마케팅봇 등 외부 공유용). thumbnail 없으면 먼저 생성. */
    const handleCopyImageUrl = async () => {
        const stage = stageRef.current;
        let url: string | null = (window as any).__lastExportUrl || null;

        if (!url) {
            if (!stage) { notifications.show({ message: 'PNG 내보내기 후 공유 가능합니다', color: 'orange' }); return; }
            const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio: 1 / (stage.scaleX() || 1), quality: 1 });
            try {
                const r = await fetch(`/api/designs/${designId}/thumbnail`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dataUrl }),
                });
                const data = await r.json();
                url = data?.url || null;
                if (url) (window as any).__lastExportUrl = url;
            } catch { /* ignore */ }
        }

        if (!url) {
            notifications.show({ message: 'R2 스토리지가 설정되지 않아 URL 복사가 불가합니다', color: 'orange' });
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            notifications.show({ title: '✅ URL 복사됨', message: '마케팅봇·SNS 등에 붙여넣기 하세요', color: 'teal', autoClose: 2000 });
        } catch {
            notifications.show({ message: url, color: 'blue' });
        }
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
                        <Group gap="xs">
                            <Button
                                leftSection={<IconSparkles size={14} />}
                                onClick={() => setAiOpen(true)}
                                variant="gradient"
                                gradient={{ from: 'pink', to: 'orange' }}
                                size="sm"
                            >
                                AI 생성
                            </Button>
                            <Button leftSection={<IconDeviceFloppy size={14} />} onClick={handleSave} loading={saving} variant="light" size="sm">
                                저장
                            </Button>
                            <Menu shadow="md" width={200} position="bottom-end">
                                <Menu.Target>
                                    <ActionIcon variant="default" size="lg" aria-label="더보기">
                                        <IconDots size={16} />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <Menu.Label>내보내기</Menu.Label>
                                    <Menu.Item leftSection={<IconDownload size={14} />} onClick={handleExport}>
                                        PNG 다운로드
                                    </Menu.Item>
                                    <Menu.Item leftSection={<IconShare size={14} />} onClick={handleCopyImageUrl}>
                                        이미지 URL 복사
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Label>템플릿</Menu.Label>
                                    <Menu.Item leftSection={<IconBookmark size={14} />} onClick={() => setTemplateOpen(true)}>
                                        템플릿으로 저장
                                    </Menu.Item>
                                </Menu.Dropdown>
                            </Menu>
                        </Group>
                    </Group>
                </Container>
            </AppShell.Header>

            <AiGenerateModal
                designId={designId}
                opened={aiOpen}
                onClose={() => setAiOpen(false)}
            />

            <SaveTemplateModal
                designId={designId}
                defaultTitle={title}
                opened={templateOpen}
                onClose={() => setTemplateOpen(false)}
            />

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
