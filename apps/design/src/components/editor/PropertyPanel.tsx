'use client';

import {
    Stack, Group, NumberInput, ColorInput, Slider, Select, Text, TextInput, Textarea, Paper, Divider,
    SegmentedControl, Box,
} from '@mantine/core';
import { useEditorStore } from '@/lib/design/store';
import type { DesignElement } from '@/lib/design/types';

/** 선택된 element 의 속성 편집 패널 (우측). */
export default function PropertyPanel() {
    const selectedIds = useEditorStore(s => s.selectedIds);
    const elements = useEditorStore(s => s.scene.elements);
    const scene = useEditorStore(s => s.scene);
    const updateElement = useEditorStore(s => s.updateElement);
    const setBackground = useEditorStore(s => s.setBackground);
    const setCanvasSize = useEditorStore(s => s.setCanvasSize);

    // 선택된 element 가 1개일 때만 properties 편집 — 0개면 캔버스 속성.
    if (selectedIds.length === 0) {
        return (
            <Paper withBorder p="md" radius="md">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="sm">캔버스</Text>
                <Stack gap="sm">
                    <Group grow>
                        <NumberInput label="가로" value={scene.width} min={100} max={4000}
                            onChange={(v) => setCanvasSize(Number(v) || scene.width, scene.height)} />
                        <NumberInput label="세로" value={scene.height} min={100} max={4000}
                            onChange={(v) => setCanvasSize(scene.width, Number(v) || scene.height)} />
                    </Group>
                    <ColorInput label="배경색" value={scene.background} onChange={setBackground} format="hex" />
                </Stack>
            </Paper>
        );
    }
    if (selectedIds.length > 1) {
        return (
            <Paper withBorder p="md" radius="md">
                <Text size="xs" c="dimmed">{selectedIds.length}개 선택됨 — 한 개만 선택하면 속성 편집 가능</Text>
            </Paper>
        );
    }

    const el = elements.find(e => e.id === selectedIds[0]);
    if (!el) return null;

    const patch = (p: Partial<DesignElement>) => updateElement(el.id, p);

    return (
        <Paper withBorder p="md" radius="md" style={{ overflow: 'auto' }}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb="sm">{TYPE_LABEL[el.type]} 속성</Text>
            <Stack gap="sm">
                {/* 공통 — 위치 + 회전 + 불투명도 */}
                <Group grow>
                    <NumberInput label="X" value={Math.round(el.x)} onChange={(v) => patch({ x: Number(v) || 0 })} />
                    <NumberInput label="Y" value={Math.round(el.y)} onChange={(v) => patch({ y: Number(v) || 0 })} />
                </Group>
                <Box>
                    <Text size="xs" c="dimmed">회전 {Math.round(el.rotation)}°</Text>
                    <Slider value={el.rotation} min={-180} max={180} step={1}
                        onChange={(v) => patch({ rotation: v })} />
                </Box>
                <Box>
                    <Text size="xs" c="dimmed">불투명도 {Math.round(el.opacity * 100)}%</Text>
                    <Slider value={el.opacity * 100} min={0} max={100} step={1}
                        onChange={(v) => patch({ opacity: v / 100 })} />
                </Box>

                <Divider />

                {/* 타입별 properties */}
                {el.type === 'rect' && (
                    <>
                        <Group grow>
                            <NumberInput label="가로" value={Math.round(el.width)} min={1} onChange={(v) => patch({ width: Number(v) || 1 })} />
                            <NumberInput label="세로" value={Math.round(el.height)} min={1} onChange={(v) => patch({ height: Number(v) || 1 })} />
                        </Group>
                        <ColorInput label="채움색" value={el.fill} onChange={(v) => patch({ fill: v })} format="hex" />
                        <ColorInput label="테두리색" value={el.stroke || ''} onChange={(v) => patch({ stroke: v || undefined })} format="hex" />
                        <NumberInput label="테두리 굵기" value={el.strokeWidth} min={0} max={20}
                            onChange={(v) => patch({ strokeWidth: Number(v) || 0 })} />
                        <NumberInput label="모서리 둥글기" value={el.cornerRadius} min={0} max={100}
                            onChange={(v) => patch({ cornerRadius: Number(v) || 0 })} />
                    </>
                )}

                {el.type === 'circle' && (
                    <>
                        <NumberInput label="반지름" value={Math.round(el.radius)} min={1}
                            onChange={(v) => patch({ radius: Number(v) || 1 })} />
                        <ColorInput label="채움색" value={el.fill} onChange={(v) => patch({ fill: v })} format="hex" />
                        <ColorInput label="테두리색" value={el.stroke || ''} onChange={(v) => patch({ stroke: v || undefined })} format="hex" />
                        <NumberInput label="테두리 굵기" value={el.strokeWidth} min={0} max={20}
                            onChange={(v) => patch({ strokeWidth: Number(v) || 0 })} />
                    </>
                )}

                {el.type === 'text' && (
                    <>
                        <Textarea label="텍스트" value={el.text} autosize minRows={2} maxRows={6}
                            onChange={(e) => patch({ text: e.currentTarget.value })} />
                        <Group grow>
                            <NumberInput label="크기" value={el.fontSize} min={8} max={400}
                                onChange={(v) => patch({ fontSize: Number(v) || 8 })} />
                            <NumberInput label="너비" value={Math.round(el.width)} min={20}
                                onChange={(v) => patch({ width: Number(v) || 20 })} />
                        </Group>
                        <ColorInput label="색상" value={el.fill} onChange={(v) => patch({ fill: v })} format="hex" />
                        <Select
                            label="굵기" value={el.fontStyle}
                            data={[
                                { value: 'normal', label: '보통' },
                                { value: 'bold', label: '굵게' },
                                { value: 'italic', label: '기울임' },
                                { value: 'bold italic', label: '굵게 + 기울임' },
                            ]}
                            onChange={(v) => patch({ fontStyle: (v || 'normal') as any })}
                        />
                        <SegmentedControl
                            value={el.align}
                            data={[
                                { value: 'left', label: '좌' },
                                { value: 'center', label: '중' },
                                { value: 'right', label: '우' },
                            ]}
                            onChange={(v) => patch({ align: v as any })}
                        />
                        <Box>
                            <Text size="xs" c="dimmed">자간 {el.letterSpacing}</Text>
                            <Slider value={el.letterSpacing} min={-5} max={20} step={0.5}
                                onChange={(v) => patch({ letterSpacing: v })} />
                        </Box>
                        <Box>
                            <Text size="xs" c="dimmed">줄간격 {el.lineHeight.toFixed(1)}</Text>
                            <Slider value={el.lineHeight * 10} min={8} max={30} step={1}
                                onChange={(v) => patch({ lineHeight: v / 10 })} />
                        </Box>
                    </>
                )}

                {el.type === 'image' && (
                    <>
                        <TextInput label="이미지 URL" value={el.src} onChange={(e) => patch({ src: e.currentTarget.value })} />
                        <Group grow>
                            <NumberInput label="가로" value={Math.round(el.width)} min={10} onChange={(v) => patch({ width: Number(v) || 10 })} />
                            <NumberInput label="세로" value={Math.round(el.height)} min={10} onChange={(v) => patch({ height: Number(v) || 10 })} />
                        </Group>
                    </>
                )}

                {el.type === 'line' && (
                    <>
                        <ColorInput label="선 색" value={el.stroke} onChange={(v) => patch({ stroke: v })} format="hex" />
                        <NumberInput label="굵기" value={el.strokeWidth} min={1} max={50}
                            onChange={(v) => patch({ strokeWidth: Number(v) || 1 })} />
                    </>
                )}
            </Stack>
        </Paper>
    );
}

const TYPE_LABEL = {
    rect:   '사각형',
    circle: '원',
    text:   '텍스트',
    image:  '이미지',
    line:   '선',
} as const;
