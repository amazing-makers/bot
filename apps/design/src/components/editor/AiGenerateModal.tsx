'use client';

import { useState } from 'react';
import {
    Modal, Stack, Textarea, Switch, Group, Button, Text, Badge, Paper, Box,
} from '@mantine/core';
import { IconSparkles, IconPhoto } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useEditorStore } from '@/lib/design/store';
import type { Scene } from '@/lib/design/types';

const SAMPLE_PROMPTS = [
    '20대 여성 화장품 브랜드 봄 신상품 광고 — 파스텔톤',
    '한정 할인 이벤트 — 빨강·검정 강조',
    '카페 신메뉴 소개 — 따뜻한 톤',
    '운동복 신상품 — 다이나믹한 분위기',
    '베이비 용품 — 부드럽고 안전한 느낌',
];

export default function AiGenerateModal({
    designId,
    opened,
    onClose,
}: {
    designId: string;
    opened: boolean;
    onClose: () => void;
}) {
    const [prompt, setPrompt] = useState('');
    const [withBackground, setWithBackground] = useState(false);
    const [loading, setLoading] = useState(false);
    const loadScene = useEditorStore(s => s.loadScene);

    const handleGenerate = async () => {
        if (prompt.trim().length < 3) {
            notifications.show({ color: 'orange', message: '프롬프트가 너무 짧습니다' });
            return;
        }
        setLoading(true);
        try {
            const r = await fetch(`/api/designs/${designId}/ai-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, withBackground }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'AI 생성 실패');

            loadScene(data.scene as Scene);
            notifications.show({
                title: '✨ AI 디자인 생성 완료',
                message: `${data.creditsUsed} credits 사용 · ${data.scene.elements.length}개 요소`,
                color: 'teal',
            });
            onClose();
            setPrompt('');
        } catch (e: any) {
            notifications.show({ title: 'AI 생성 실패', message: e?.message || '오류', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const totalCost = withBackground ? 30 : 10;

    return (
        <Modal opened={opened} onClose={onClose} title={<Text fw={700}>✨ AI 디자인 자동 생성</Text>} size="lg">
            <Stack gap="md">
                <Paper p="sm" radius="sm" bg="pink.0" withBorder>
                    <Text size="xs" c="pink.9">
                        Claude 가 한국어 카피·layout 을 자동 구성. FLUX 옵션 켜면 배경 이미지도 같이.
                        <br />
                        ⚠️ 기존 캔버스 내용은 <strong>덮어쓰기됨</strong>. 저장된 디자인은 영향 X.
                    </Text>
                </Paper>

                <Textarea
                    label="프롬프트"
                    description="어떤 디자인을 원하는지 자연어로"
                    placeholder="예: 20대 여성 화장품 브랜드 봄 신상품 광고, 파스텔톤"
                    value={prompt}
                    onChange={(e) => setPrompt(e.currentTarget.value)}
                    autosize
                    minRows={3}
                    maxRows={6}
                />

                <Box>
                    <Text size="xs" c="dimmed" mb={4}>💡 샘플 (클릭해서 사용)</Text>
                    <Group gap={4}>
                        {SAMPLE_PROMPTS.map(s => (
                            <Badge
                                key={s}
                                variant="light"
                                color="pink"
                                style={{ cursor: 'pointer', textTransform: 'none' }}
                                onClick={() => setPrompt(s)}
                            >
                                {s.slice(0, 30)}...
                            </Badge>
                        ))}
                    </Group>
                </Box>

                <Paper p="sm" radius="sm" withBorder>
                    <Group justify="space-between">
                        <Box>
                            <Group gap={6}>
                                <IconPhoto size={14} />
                                <Text size="sm" fw={600}>배경 이미지 같이 생성 (FLUX)</Text>
                            </Group>
                            <Text size="11px" c="dimmed">
                                추가 +20 credits. 프롬프트에 맞는 배경 → Claude 가 위에 layout.
                            </Text>
                        </Box>
                        <Switch checked={withBackground} onChange={(e) => setWithBackground(e.currentTarget.checked)} />
                    </Group>
                </Paper>

                <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                        예상 비용: <strong>{totalCost} credits</strong> (Claude {10}{withBackground && ' + FLUX 20'})
                    </Text>
                    <Group gap="xs">
                        <Button variant="subtle" onClick={onClose} disabled={loading}>취소</Button>
                        <Button
                            color="pink"
                            leftSection={<IconSparkles size={14} />}
                            loading={loading}
                            onClick={handleGenerate}
                        >
                            생성 ({totalCost} credits)
                        </Button>
                    </Group>
                </Group>
            </Stack>
        </Modal>
    );
}
