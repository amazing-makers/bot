'use client';

import { useState } from 'react';
import {
    Stack, Group, Button, Textarea, Text, Badge, Box, Paper, Image,
} from '@mantine/core';
import { IconRefresh, IconCheck, IconArrowsLeftRight } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

interface TextRegion {
    id: string;
    bboxX: number;
    bboxY: number;
    bboxW: number;
    bboxH: number;
    originalText: string;
    sourceLanguage: string | null;
    translatedText: string | null;
    userOverride: string | null;
}

interface Output {
    r2Url: string;
}

export default function RecomposeForm({
    scrapedImageId,
    initialRegions,
    latestOutput,
    sourceImageUrl,
}: {
    scrapedImageId: string;
    initialRegions: TextRegion[];
    latestOutput?: Output;
    sourceImageUrl?: string;
}) {
    // 각 region 의 현재 표시 텍스트
    const [edits, setEdits] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        for (const r of initialRegions) {
            init[r.id] = r.userOverride ?? r.translatedText ?? r.originalText;
        }
        return init;
    });
    const [loading, setLoading] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(latestOutput?.r2Url || null);
    const router = useRouter();

    const dirty = initialRegions.some(r => {
        const original = r.userOverride ?? r.translatedText ?? r.originalText;
        return edits[r.id] !== original;
    });

    const handleRecompose = async () => {
        setLoading(true);
        try {
            const r = await fetch(`/api/scraped-images/${scrapedImageId}/recompose`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regionUserOverrides: edits }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '재합성 실패');
            setResultUrl(data.outputUrl);
            notifications.show({
                title: '✨ 재합성 완료',
                message: `${data.creditsUsed} credit 사용 (잔액 ${data.balanceAfter})`,
                color: 'teal',
            });
            router.refresh();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '재합성 실패', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack gap="md">
            {/* 텍스트 편집 form */}
            <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="xs">
                    <Text fw={700} size="sm">번역 수정 ({initialRegions.length}개 텍스트)</Text>
                    <Button
                        onClick={handleRecompose}
                        loading={loading}
                        disabled={!dirty || loading}
                        size="xs"
                        color="violet"
                        leftSection={<IconRefresh size={14} />}
                    >
                        재합성 (1 credit)
                    </Button>
                </Group>
                <Stack gap={6}>
                    {initialRegions.map((r, i) => {
                        const orig = r.userOverride ?? r.translatedText ?? r.originalText;
                        const isEdited = edits[r.id] !== orig;
                        return (
                            <Box key={r.id}>
                                <Group gap={6} mb={2}>
                                    <Badge size="xs" variant="light">{r.sourceLanguage || '?'}</Badge>
                                    <Text size="11px" c="dimmed" style={{ flex: 1 }} truncate>
                                        원문: {r.originalText}
                                    </Text>
                                    {isEdited && <Badge size="xs" color="orange">수정됨</Badge>}
                                </Group>
                                <Textarea
                                    value={edits[r.id] || ''}
                                    onChange={(e) => setEdits(prev => ({ ...prev, [r.id]: e.currentTarget.value }))}
                                    autosize
                                    minRows={1}
                                    maxRows={3}
                                    size="sm"
                                />
                            </Box>
                        );
                    })}
                </Stack>
                {dirty && (
                    <Text size="xs" c="orange" mt="xs">
                        ⓘ 수정된 텍스트가 있습니다. '재합성' 버튼을 눌러 새 이미지를 만드세요. (1 credit, 인페인팅 재사용)
                    </Text>
                )}
            </Paper>

            {/* 결과 미리보기 (옵션 — 별도 표시) */}
            {resultUrl && (
                <Paper withBorder p="xs" radius="md">
                    <Group gap="xs" mb={4}>
                        <IconCheck size={14} color="var(--mantine-color-teal-6)" />
                        <Text size="xs" fw={600}>최신 합성 결과</Text>
                    </Group>
                    <Image src={resultUrl} radius="sm" fit="contain" mah={300} />
                </Paper>
            )}
        </Stack>
    );
}
