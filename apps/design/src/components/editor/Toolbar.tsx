'use client';

import { Group, ActionIcon, Button, Tooltip, Divider, Menu, Text } from '@mantine/core';
import {
    IconSquare, IconCircle, IconTypography, IconPhoto, IconLine, IconTrash, IconCopy,
    IconArrowBackUp, IconArrowForwardUp, IconDownload, IconArrowsUpDown,
} from '@tabler/icons-react';
import { useEditorStore } from '@/lib/design/store';
import type { ElementType } from '@/lib/design/types';

export default function Toolbar({ onExport, onUploadImage }: {
    onExport: () => void;
    onUploadImage: () => void;
}) {
    const selectedIds = useEditorStore(s => s.selectedIds);
    const addElement = useEditorStore(s => s.addElement);
    const deleteElements = useEditorStore(s => s.deleteElements);
    const duplicateElements = useEditorStore(s => s.duplicateElements);
    const undo = useEditorStore(s => s.undo);
    const redo = useEditorStore(s => s.redo);
    const reorderElement = useEditorStore(s => s.reorderElement);
    const historyIndex = useEditorStore(s => s.historyIndex);
    const history = useEditorStore(s => s.history);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const hasSelection = selectedIds.length > 0;

    const addAndCenter = (type: ElementType) => addElement(type);

    return (
        <Group gap="xs" wrap="nowrap" px="md" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', overflow: 'auto' }}>
            <Tooltip label="사각형 추가">
                <ActionIcon variant="subtle" size="lg" onClick={() => addAndCenter('rect')}><IconSquare size={20} /></ActionIcon>
            </Tooltip>
            <Tooltip label="원 추가">
                <ActionIcon variant="subtle" size="lg" onClick={() => addAndCenter('circle')}><IconCircle size={20} /></ActionIcon>
            </Tooltip>
            <Tooltip label="텍스트 추가">
                <ActionIcon variant="subtle" size="lg" onClick={() => addAndCenter('text')}><IconTypography size={20} /></ActionIcon>
            </Tooltip>
            <Tooltip label="이미지 업로드">
                <ActionIcon variant="subtle" size="lg" onClick={onUploadImage}><IconPhoto size={20} /></ActionIcon>
            </Tooltip>
            <Tooltip label="선 추가">
                <ActionIcon variant="subtle" size="lg" onClick={() => addAndCenter('line')}><IconLine size={20} /></ActionIcon>
            </Tooltip>

            <Divider orientation="vertical" />

            <Tooltip label="실행 취소 (Ctrl+Z)">
                <ActionIcon variant="subtle" size="lg" disabled={!canUndo} onClick={undo}><IconArrowBackUp size={20} /></ActionIcon>
            </Tooltip>
            <Tooltip label="재실행 (Ctrl+Shift+Z)">
                <ActionIcon variant="subtle" size="lg" disabled={!canRedo} onClick={redo}><IconArrowForwardUp size={20} /></ActionIcon>
            </Tooltip>

            <Divider orientation="vertical" />

            <Tooltip label="복제 (Ctrl+D)">
                <ActionIcon variant="subtle" size="lg" disabled={!hasSelection} onClick={() => duplicateElements(selectedIds)}>
                    <IconCopy size={20} />
                </ActionIcon>
            </Tooltip>
            <Tooltip label="삭제 (Delete)">
                <ActionIcon variant="subtle" size="lg" color="red" disabled={!hasSelection} onClick={() => deleteElements(selectedIds)}>
                    <IconTrash size={20} />
                </ActionIcon>
            </Tooltip>

            <Menu disabled={!hasSelection || selectedIds.length !== 1}>
                <Menu.Target>
                    <Tooltip label="순서 변경">
                        <ActionIcon variant="subtle" size="lg" disabled={!hasSelection || selectedIds.length !== 1}>
                            <IconArrowsUpDown size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item onClick={() => reorderElement(selectedIds[0], 'top')}>맨 앞으로</Menu.Item>
                    <Menu.Item onClick={() => reorderElement(selectedIds[0], 'up')}>앞으로</Menu.Item>
                    <Menu.Item onClick={() => reorderElement(selectedIds[0], 'down')}>뒤로</Menu.Item>
                    <Menu.Item onClick={() => reorderElement(selectedIds[0], 'bottom')}>맨 뒤로</Menu.Item>
                </Menu.Dropdown>
            </Menu>

            <div style={{ flex: 1 }} />

            <Text size="xs" c="dimmed">{selectedIds.length > 0 ? `${selectedIds.length}개 선택` : ''}</Text>

            <Button leftSection={<IconDownload size={16} />} color="violet" onClick={onExport}>
                PNG 내보내기
            </Button>
        </Group>
    );
}
