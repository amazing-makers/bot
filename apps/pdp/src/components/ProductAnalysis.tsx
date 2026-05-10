'use client';

import { useState } from 'react';
import {
    Card, Stack, Group, Title, Text, Badge, Button, SimpleGrid, Box, Paper, ThemeIcon,
} from '@mantine/core';
import { IconSparkles, IconCoin, IconRefresh, IconCheck, IconBulb, IconTarget, IconTag, IconHash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Analysis {
    category: string;
    subcategory?: string;
    features: string[];
    targetAudience: string;
    competitivePoints: string[];
    suggestedPriceRange?: { min: number; max: number; currency: string };
    marketingHooks: string[];
    keywords: string[];
}

export default function ProductAnalysis({
    productId,
    initialAnalysis,
    initialAnalyzedAt,
}: {
    productId: string;
    initialAnalysis: Analysis | null;
    initialAnalyzedAt: string | null;
}) {
    const [analysis, setAnalysis] = useState<Analysis | null>(initialAnalysis);
    const [analyzedAt, setAnalyzedAt] = useState<string | null>(initialAnalyzedAt);
    const [loading, setLoading] = useState(false);

    const runAnalyze = async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/products/${productId}/analyze`, { method: 'POST' });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '분석 실패');
            setAnalysis(data.analysis);
            setAnalyzedAt(new Date().toISOString());
            notifications.show({
                title: '✨ 상품 분석 완료',
                message: `${data.creditsUsed} credits 사용 (잔액 ${data.balanceAfter})`,
                color: 'teal',
            });
        } catch (e: any) {
            notifications.show({ title: '분석 실패', message: e?.message || '오류', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    if (!analysis) {
        return (
            <Card withBorder p="lg" radius="md">
                <Stack gap="md" align="center" ta="center" py="md">
                    <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size="xl" radius="md">
                        <IconSparkles size={24} />
                    </ThemeIcon>
                    <Stack gap={4}>
                        <Text fw={700} size="lg">AI 상품 분석</Text>
                        <Text size="sm" c="dimmed">
                            Claude Opus 가 이 상품을 분석해 카테고리·특징·타겟·마케팅 훅·키워드를 추천합니다.
                        </Text>
                    </Stack>
                    <Button
                        onClick={runAnalyze}
                        loading={loading}
                        leftSection={<IconSparkles size={16} />}
                        color="violet"
                        size="md"
                    >
                        분석 시작 (10 credits)
                    </Button>
                </Stack>
            </Card>
        );
    }

    return (
        <Card withBorder p="lg" radius="md">
            <Group justify="space-between" mb="md">
                <Group gap="xs">
                    <ThemeIcon variant="light" color="violet"><IconSparkles size={18} /></ThemeIcon>
                    <Text fw={700} size="lg">AI 상품 분석</Text>
                    {analyzedAt && (
                        <Text size="xs" c="dimmed">
                            ({new Date(analyzedAt).toLocaleString('ko-KR')})
                        </Text>
                    )}
                </Group>
                <Button
                    onClick={runAnalyze}
                    loading={loading}
                    variant="subtle"
                    size="xs"
                    leftSection={<IconRefresh size={14} />}
                >
                    재분석 (10 credits)
                </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {/* 카테고리 + 가격 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap="xs" mb={4}>
                        <IconTag size={14} />
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">카테고리</Text>
                    </Group>
                    <Text fw={700}>{analysis.category}</Text>
                    {analysis.subcategory && (
                        <Text size="sm" c="dimmed">→ {analysis.subcategory}</Text>
                    )}
                    {analysis.suggestedPriceRange && (
                        <Box mt="sm" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                            <Text size="xs" c="dimmed">한국 시장 추천 가격</Text>
                            <Text fw={600}>
                                ₩{analysis.suggestedPriceRange.min.toLocaleString()} ~ ₩{analysis.suggestedPriceRange.max.toLocaleString()}
                            </Text>
                        </Box>
                    )}
                </Paper>

                {/* 타겟 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap="xs" mb={4}>
                        <IconTarget size={14} />
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">타겟 고객</Text>
                    </Group>
                    <Text size="sm">{analysis.targetAudience}</Text>
                </Paper>

                {/* 특징 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap="xs" mb="xs">
                        <IconCheck size={14} />
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">핵심 특징 ({analysis.features.length})</Text>
                    </Group>
                    <Stack gap={4}>
                        {analysis.features.map((f, i) => (
                            <Text key={i} size="sm">• {f}</Text>
                        ))}
                    </Stack>
                </Paper>

                {/* 경쟁 강점 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap="xs" mb="xs">
                        <IconBulb size={14} />
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">경쟁 강점</Text>
                    </Group>
                    <Stack gap={4}>
                        {analysis.competitivePoints.length === 0
                            ? <Text size="xs" c="dimmed">분석 결과 없음</Text>
                            : analysis.competitivePoints.map((p, i) => (
                                <Text key={i} size="sm">⭐ {p}</Text>
                            ))}
                    </Stack>
                </Paper>
            </SimpleGrid>

            {/* 마케팅 훅 (전체 너비) */}
            <Paper withBorder p="md" radius="md" mt="md" bg="violet.0">
                <Group gap="xs" mb="xs">
                    <IconSparkles size={14} />
                    <Text size="xs" fw={700} tt="uppercase">마케팅 카피 (SNS·광고용)</Text>
                </Group>
                <Group gap="xs">
                    {analysis.marketingHooks.map((h, i) => (
                        <Badge key={i} size="lg" variant="light" color="violet"
                            style={{ cursor: 'pointer', textTransform: 'none' }}
                            onClick={() => {
                                navigator.clipboard.writeText(h);
                                notifications.show({ message: '복사됨', color: 'teal', autoClose: 1500 });
                            }}
                            title="클릭하면 복사"
                        >
                            {h}
                        </Badge>
                    ))}
                </Group>
            </Paper>

            {/* 키워드 (전체 너비) */}
            <Paper withBorder p="md" radius="md" mt="md">
                <Group gap="xs" mb="xs">
                    <IconHash size={14} />
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed">한국 시장 키워드 (네이버·쿠팡 SEO)</Text>
                </Group>
                <Group gap={4}>
                    {analysis.keywords.map((k, i) => (
                        <Badge key={i} variant="dot" color="cyan"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                navigator.clipboard.writeText(k);
                                notifications.show({ message: '복사됨', color: 'teal', autoClose: 1500 });
                            }}
                        >
                            {k}
                        </Badge>
                    ))}
                </Group>
                <Text size="11px" c="dimmed" mt="xs">
                    💡 클릭하면 클립보드 복사 — 쿠팡/네이버 상품 등록 시 그대로 사용 가능.
                </Text>
            </Paper>
        </Card>
    );
}
