'use client';

import { useState } from 'react';
import { SimpleGrid, Card, Image, Text, Badge, Button, Group, Stack, Box, ActionIcon, Tooltip } from '@mantine/core';
import { IconBookmark, IconTrash, IconPlus, IconLayoutGrid } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

interface TemplateItem {
    id: string;
    userId: string | null;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    canvasWidth: number;
    canvasHeight: number;
    canvasSize: string;
    tags: string[];
    isPublic: boolean;
    usageCount: number;
}

interface Props {
    initialTemplates: TemplateItem[];
    currentUserId: string;
}

export default function TemplateGallery({ initialTemplates, currentUserId }: Props) {
    const router = useRouter();
    const [templates, setTemplates] = useState<TemplateItem[]>(initialTemplates);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleUse = async (templateId: string) => {
        setLoadingId(templateId);
        try {
            const r = await fetch(`/api/templates/${templateId}`, {
                method: 'POST',
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '생성 실패');
            notifications.show({ title: '✅ 디자인 생성됨', message: '에디터로 이동합니다', color: 'teal', autoClose: 1500 });
            router.push(data.editorUrl);
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '오류', color: 'red' });
        } finally {
            setLoadingId(null);
        }
    };

    const handleDelete = async (templateId: string) => {
        if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;
        try {
            const r = await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
            if (!r.ok) throw new Error('삭제 실패');
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            notifications.show({ message: '템플릿 삭제됨', color: 'gray' });
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '오류', color: 'red' });
        }
    };

    if (templates.length === 0) {
        return (
            <Card withBorder p="xl" radius="md" ta="center">
                <Stack gap="xs" align="center">
                    <IconLayoutGrid size={36} color="var(--mantine-color-gray-5)" />
                    <Text fw={600}>저장된 템플릿이 없습니다</Text>
                    <Text size="sm" c="dimmed">에디터에서 ⋯ → 템플릿으로 저장하면 여기에 표시됩니다</Text>
                </Stack>
            </Card>
        );
    }

    return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="sm">
            {templates.map(t => {
                const isOwn = t.userId === currentUserId;
                return (
                    <Card key={t.id} withBorder p="sm" radius="md">
                        {/* 미리보기 */}
                        {t.thumbnailUrl ? (
                            <Image src={t.thumbnailUrl} radius="sm" fit="contain" h={130} alt={t.title} />
                        ) : (
                            <Box h={130} bg="gray.1" style={{ borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <IconBookmark size={28} color="var(--mantine-color-gray-4)" />
                            </Box>
                        )}

                        <Stack gap={4} mt="sm">
                            <Group justify="space-between" wrap="nowrap">
                                <Text fw={600} size="sm" lineClamp={1} style={{ flex: 1 }}>{t.title}</Text>
                                {isOwn && (
                                    <Tooltip label="삭제">
                                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => handleDelete(t.id)}>
                                            <IconTrash size={12} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </Group>

                            {t.description && (
                                <Text size="xs" c="dimmed" lineClamp={1}>{t.description}</Text>
                            )}

                            <Group gap={4} wrap="wrap">
                                <Badge size="xs" variant="light">{t.canvasWidth}×{t.canvasHeight}</Badge>
                                {t.isPublic && <Badge size="xs" variant="light" color="teal">공개</Badge>}
                                {t.tags.slice(0, 2).map(tag => (
                                    <Badge key={tag} size="xs" variant="dot" color="violet">{tag}</Badge>
                                ))}
                            </Group>

                            <Button
                                size="xs"
                                variant="light"
                                color="violet"
                                fullWidth
                                leftSection={<IconPlus size={12} />}
                                loading={loadingId === t.id}
                                onClick={() => handleUse(t.id)}
                                mt={4}
                            >
                                이 템플릿으로 시작
                            </Button>
                        </Stack>
                    </Card>
                );
            })}
        </SimpleGrid>
    );
}
