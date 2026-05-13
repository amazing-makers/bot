'use client';

import { Stack, Group, ActionIcon, Text, Box, Paper, ScrollArea, Tooltip } from '@mantine/core';
import {
    IconEye, IconEyeOff, IconLock, IconLockOpen, IconSquare, IconCircle, IconTypography,
    IconPhoto, IconLine,
} from '@tabler/icons-react';
import { useEditorStore } from '@/lib/design/store';
import type { DesignElement } from '@/lib/design/types';

/** 우상단 Layers 패널 — z-order 역순 (위가 맨 앞). */
export default function LayersPanel() {
    const elements = useEditorStore(s => s.scene.elements);
    const selectedIds = useEditorStore(s => s.selectedIds);
    const select = useEditorStore(s => s.select);
    const toggleVisibility = useEditorStore(s => s.toggleVisibility);
    const toggleLock = useEditorStore(s => s.toggleLock);

    return (
        <Paper withBorder p="xs" radius="md" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="xs">레이어</Text>
            <ScrollArea style={{ flex: 1 }} type="auto">
                <Stack gap={2}>
                    {elements.length === 0 ? (
                        <Text size="xs" c="dimmed" ta="center" py="md">
                            도형/텍스트 추가하면 여기에 표시
                        </Text>
                    ) : (
                        // 화면상 위가 맨 앞 (last element in array) — reverse 해서 표시
                        [...elements].reverse().map((el) => (
                            <LayerRow
                                key={el.id}
                                element={el}
                                selected={selectedIds.includes(el.id)}
                                onSelect={() => select([el.id])}
                                onToggleVisibility={() => toggleVisibility(el.id)}
                                onToggleLock={() => toggleLock(el.id)}
                            />
                        ))
                    )}
                </Stack>
            </ScrollArea>
        </Paper>
    );
}

function LayerRow({ element, selected, onSelect, onToggleVisibility, onToggleLock }: {
    element: DesignElement;
    selected: boolean;
    onSelect: () => void;
    onToggleVisibility: () => void;
    onToggleLock: () => void;
}) {
    const Icon = ELEMENT_ICONS[element.type];
    const label = ELEMENT_LABELS[element.type];
    const preview = element.type === 'text' ? (element.text || '(빈 텍스트)') : label;

    return (
        <Box
            onClick={onSelect}
            style={{
                background: selected ? 'var(--mantine-color-violet-0)' : 'transparent',
                border: selected ? '1px solid var(--mantine-color-violet-4)' : '1px solid transparent',
                borderRadius: 4,
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
            }}
        >
            <Icon size={14} style={{ flexShrink: 0, opacity: element.visible ? 1 : 0.3 }} />
            <Text size="xs" lineClamp={1} style={{ flex: 1, opacity: element.visible ? 1 : 0.4 }}>
                {preview}
            </Text>
            <Tooltip label={element.visible ? '숨기기' : '보이기'}>
                <ActionIcon size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}>
                    {element.visible ? <IconEye size={12} /> : <IconEyeOff size={12} />}
                </ActionIcon>
            </Tooltip>
            <Tooltip label={element.locked ? '잠금 해제' : '잠금'}>
                <ActionIcon size="xs" variant="subtle" onClick={(e) => { e.stopPropagation(); onToggleLock(); }}>
                    {element.locked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
                </ActionIcon>
            </Tooltip>
        </Box>
    );
}

const ELEMENT_ICONS = {
    rect:   IconSquare,
    circle: IconCircle,
    text:   IconTypography,
    image:  IconPhoto,
    line:   IconLine,
} as const;

const ELEMENT_LABELS = {
    rect:   '사각형',
    circle: '원',
    text:   '텍스트',
    image:  '이미지',
    line:   '선',
} as const;
