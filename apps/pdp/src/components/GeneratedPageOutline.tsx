'use client';

import { useState } from 'react';
import {
    Card, Stack, Group, Text, Badge, Button, Box, Paper, ThemeIcon, Textarea, Divider,
} from '@mantine/core';
import {
    IconLayoutGrid, IconRefresh, IconSparkles, IconCopy, IconArrowDown,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface PageSection {
    type: 'hero' | 'feature_list' | 'comparison' | 'usage' | 'social_proof' | 'cta';
    headline: string;
    body: string;
    cta?: string;
    imagePrompt?: string;
    preview?: string;
}

interface Outline {
    sections: PageSection[];
    overallTone: string;
    targetMobile: boolean;
}

const TYPE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
    hero:           { label: '히어로 (메인 배너)',       color: 'violet', emoji: '🎯' },
    feature_list:   { label: '핵심 특징',                color: 'blue',   emoji: '✨' },
    comparison:     { label: '경쟁사 대비',              color: 'teal',   emoji: '⚖️' },
    usage:          { label: '사용 시나리오',            color: 'orange', emoji: '🎬' },
    social_proof:   { label: '후기·신뢰 시그널',         color: 'pink',   emoji: '⭐' },
    cta:            { label: '구매 유도',                color: 'red',    emoji: '🛒' },
};

export default function GeneratedPageOutline({
    productId,
    initial,
}: {
    productId: string;
    initial?: Outline | null;
}) {
    const [outline, setOutline] = useState<Outline | null>(initial || null);
    const [loading, setLoading] = useState(false);
    const [showBrief, setShowBrief] = useState(false);
    const [brief, setBrief] = useState('');

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/products/${productId}/generate-page`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userBrief: brief || undefined }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '생성 실패');
            setOutline(data.outline);
            notifications.show({
                title: '✨ 상세페이지 outline 생성 완료',
                message: `${data.creditsUsed} credits 사용 · ${data.outline.sections.length}개 섹션`,
                color: 'teal',
            });
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '생성 실패', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    if (!outline) {
        return (
            <Card withBorder p="lg" radius="md">
                <Stack gap="md" align="center" ta="center" py="md">
                    <ThemeIcon variant="gradient" gradient={{ from: 'pink', to: 'violet' }} size="xl" radius="md">
                        <IconLayoutGrid size={24} />
                    </ThemeIcon>
                    <Stack gap={4}>
                        <Text fw={700} size="lg">신규 상세페이지 자동 생성</Text>
                        <Text size="sm" c="dimmed">
                            상품 분석 결과 기반 → Claude 가 6-9개 섹션 (히어로/특징/비교/사용/후기/CTA) outline 자동 생성.
                            <br />
                            ⓘ 분석 미완료 시 자동으로 같이 진행 (5 credits + 자동 analyze 10 credits).
                        </Text>
                    </Stack>

                    {showBrief ? (
                        <Stack gap="xs" w="100%" maw={500}>
                            <Textarea
                                label="추가 요청 (선택)"
                                placeholder="예: '브랜드 톤이 더 고급스럽게', '20대 여성 타겟', '가성비 강조'"
                                autosize minRows={2} maxRows={4}
                                value={brief}
                                onChange={(e) => setBrief(e.currentTarget.value)}
                            />
                            <Group justify="space-between">
                                <Button variant="subtle" size="xs" onClick={() => { setShowBrief(false); setBrief(''); }}>
                                    취소
                                </Button>
                                <Button onClick={handleGenerate} loading={loading} color="violet" leftSection={<IconSparkles size={14} />}>
                                    생성 시작 (5 credits)
                                </Button>
                            </Group>
                        </Stack>
                    ) : (
                        <Group gap="xs">
                            <Button variant="light" onClick={() => setShowBrief(true)}>
                                추가 요청 입력
                            </Button>
                            <Button onClick={handleGenerate} loading={loading} color="violet" leftSection={<IconSparkles size={16} />}>
                                바로 생성 (5 credits)
                            </Button>
                        </Group>
                    )}
                </Stack>
            </Card>
        );
    }

    return (
        <Card withBorder p="lg" radius="md">
            <Group justify="space-between" mb="md">
                <Group gap="xs">
                    <ThemeIcon variant="light" color="violet"><IconLayoutGrid size={18} /></ThemeIcon>
                    <Text fw={700} size="lg">생성된 상세페이지 Outline</Text>
                    <Badge variant="light">{outline.sections.length}개 섹션</Badge>
                    <Badge variant="dot" color="gray">톤: {outline.overallTone}</Badge>
                </Group>
                <Button onClick={handleGenerate} loading={loading} variant="subtle" size="xs"
                    leftSection={<IconRefresh size={14} />}
                >
                    재생성 (5 credits)
                </Button>
            </Group>

            <Stack gap="md">
                {outline.sections.map((s, i) => {
                    const meta = TYPE_LABELS[s.type] || { label: s.type, color: 'gray', emoji: '📄' };
                    const fullText = `${s.headline}\n\n${s.body}${s.cta ? `\n\n[ ${s.cta} ]` : ''}`;
                    return (
                        <Box key={i}>
                            {i > 0 && (
                                <Group justify="center" my="xs">
                                    <IconArrowDown size={16} color="var(--mantine-color-dimmed)" />
                                </Group>
                            )}
                            <Paper withBorder p="md" radius="md">
                                <Group justify="space-between" mb="xs">
                                    <Group gap={6}>
                                        <Text size="lg">{meta.emoji}</Text>
                                        <Badge variant="light" color={meta.color}>{i + 1}. {meta.label}</Badge>
                                        {s.preview && <Text size="11px" c="dimmed">— {s.preview}</Text>}
                                    </Group>
                                    <Button
                                        size="compact-xs"
                                        variant="subtle"
                                        leftSection={<IconCopy size={12} />}
                                        onClick={() => {
                                            navigator.clipboard.writeText(fullText);
                                            notifications.show({ message: '섹션 카피 복사됨', color: 'teal', autoClose: 1500 });
                                        }}
                                    >
                                        복사
                                    </Button>
                                </Group>
                                <Text fw={700} size="lg" mb={4}>{s.headline}</Text>
                                <Text size="sm" c="dimmed" mb={4}>{s.body}</Text>
                                {s.cta && (
                                    <Badge size="lg" color={meta.color} mt="xs">[ {s.cta} ]</Badge>
                                )}
                                {s.imagePrompt && (
                                    <>
                                        <Divider my="xs" />
                                        <Text size="11px" c="dimmed">
                                            <strong>이미지 prompt:</strong> {s.imagePrompt}
                                        </Text>
                                    </>
                                )}
                            </Paper>
                        </Box>
                    );
                })}
            </Stack>

            <Text size="xs" c="dimmed" mt="md" ta="center">
                ⓘ Phase 3.2 (이미지 생성) + 3.3 (레이아웃 합성) 으로 한 장 PNG 자동 완성 — 다음 업데이트.
            </Text>
        </Card>
    );
}
