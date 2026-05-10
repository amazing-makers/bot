'use client';

import { useState } from 'react';
import {
    Card, Stack, Group, Text, Badge, Button, Box, Paper, ThemeIcon, Textarea, Divider, Image,
} from '@mantine/core';
import {
    IconLayoutGrid, IconRefresh, IconSparkles, IconCopy, IconArrowDown, IconPhoto, IconCheck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface PageSection {
    type: 'hero' | 'feature_list' | 'comparison' | 'usage' | 'social_proof' | 'cta';
    headline: string;
    body: string;
    cta?: string;
    imagePrompt?: string;
    preview?: string;
    /** Phase 3.2 — FLUX 로 생성된 섹션 이미지 (R2 URL). 없으면 미생성. */
    generatedImageUrl?: string;
    generatedImageOutputId?: string;
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
    initialComposedPageUrl,
}: {
    productId: string;
    initial?: Outline | null;
    /** Phase 3.3 — 이미 합성한 1장 PNG URL (있으면 표시). */
    initialComposedPageUrl?: string | null;
}) {
    const [outline, setOutline] = useState<Outline | null>(initial || null);
    const [loading, setLoading] = useState(false);
    const [showBrief, setShowBrief] = useState(false);
    const [brief, setBrief] = useState('');
    /** sectionIdx → loading 여부 (Phase 3.2 이미지 생성 진행 중인 섹션). */
    const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
    /** Phase 3.3 — 전체 페이지 합성 진행 + 결과 URL. */
    const [composeLoading, setComposeLoading] = useState(false);
    const [composedPageUrl, setComposedPageUrl] = useState<string | null>(initialComposedPageUrl || null);

    const handleComposePage = async () => {
        setComposeLoading(true);
        try {
            const r = await fetch(`/api/products/${productId}/compose-page`, { method: 'POST' });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '페이지 합성 실패');
            setComposedPageUrl(data.r2Url);
            notifications.show({
                title: '✨ 상세페이지 1장 PNG 합성 완료',
                message: `${data.creditsUsed} credit · ${data.width}×${data.height}px · 잔액 ${data.balanceAfter}`,
                color: 'teal',
            });
        } catch (e: any) {
            notifications.show({ title: '합성 실패', message: e?.message || '오류', color: 'red' });
        } finally {
            setComposeLoading(false);
        }
    };

    const handleGenerateImage = async (sectionIdx: number, imagePrompt?: string) => {
        setImageLoading(prev => ({ ...prev, [sectionIdx]: true }));
        try {
            const r = await fetch(`/api/products/${productId}/generate-section-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sectionIdx, imagePrompt }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '이미지 생성 실패');

            // outline 의 해당 section 에 generatedImageUrl 반영
            setOutline(prev => {
                if (!prev) return prev;
                const updated = prev.sections.map((s, i) =>
                    i === sectionIdx
                        ? { ...s, generatedImageUrl: data.r2Url, generatedImageOutputId: data.outputImageId }
                        : s,
                );
                return { ...prev, sections: updated };
            });
            notifications.show({
                title: '✨ 섹션 이미지 생성 완료',
                message: `${data.creditsUsed} credits 사용 · 잔액 ${data.balanceAfter}`,
                color: 'teal',
            });
        } catch (e: any) {
            notifications.show({ title: '이미지 생성 실패', message: e?.message || '오류', color: 'red' });
        } finally {
            setImageLoading(prev => ({ ...prev, [sectionIdx]: false }));
        }
    };

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
                <Group gap="xs">
                    <Button
                        onClick={handleComposePage}
                        loading={composeLoading}
                        size="xs"
                        color="teal"
                        leftSection={<IconLayoutGrid size={14} />}
                    >
                        {composedPageUrl ? '전체 재합성' : '전체 1장 PNG 합성'} (1 credit)
                    </Button>
                    <Button onClick={handleGenerate} loading={loading} variant="subtle" size="xs"
                        leftSection={<IconRefresh size={14} />}
                    >
                        재생성 (5 credits)
                    </Button>
                </Group>
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
                                        <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
                                            <Text size="11px" c="dimmed" style={{ flex: 1 }}>
                                                <strong>이미지 prompt:</strong> {s.imagePrompt}
                                            </Text>
                                            <Button
                                                size="compact-xs"
                                                variant={s.generatedImageUrl ? 'subtle' : 'light'}
                                                color={s.generatedImageUrl ? 'gray' : 'pink'}
                                                loading={imageLoading[i]}
                                                leftSection={s.generatedImageUrl ? <IconRefresh size={12} /> : <IconPhoto size={12} />}
                                                onClick={() => handleGenerateImage(i, s.imagePrompt)}
                                            >
                                                {s.generatedImageUrl ? '재생성' : '이미지 생성'} (20 credits)
                                            </Button>
                                        </Group>
                                        {s.generatedImageUrl && (
                                            <Box mt="xs">
                                                <Group gap={4} mb={4}>
                                                    <IconCheck size={12} color="var(--mantine-color-teal-6)" />
                                                    <Text size="11px" c="teal" fw={600}>FLUX 1.1 Pro 생성 완료</Text>
                                                </Group>
                                                <Image
                                                    src={s.generatedImageUrl}
                                                    radius="sm"
                                                    fit="contain"
                                                    mah={300}
                                                    alt={`${meta.label} 이미지`}
                                                />
                                            </Box>
                                        )}
                                    </>
                                )}
                            </Paper>
                        </Box>
                    );
                })}
            </Stack>

            {composedPageUrl && (
                <Paper withBorder p="md" radius="md" mt="lg" bg="teal.0">
                    <Group justify="space-between" mb="xs">
                        <Group gap="xs">
                            <ThemeIcon variant="light" color="teal" size="md"><IconCheck size={16} /></ThemeIcon>
                            <Text fw={700} size="md">최종 상세페이지 1장 PNG</Text>
                            <Badge variant="dot" color="teal">쿠팡·네이버 업로드 가능</Badge>
                        </Group>
                        <Button
                            component="a"
                            href={composedPageUrl}
                            download="detail-page.png"
                            target="_blank"
                            size="xs"
                            color="teal"
                        >
                            다운로드
                        </Button>
                    </Group>
                    <Image
                        src={composedPageUrl}
                        radius="sm"
                        fit="contain"
                        mah={600}
                        alt="합성된 상세페이지"
                    />
                </Paper>
            )}

            <Text size="xs" c="dimmed" mt="md" ta="center">
                ⓘ 섹션별 이미지 생성 후 '전체 1장 PNG 합성' 으로 한 장의 상세페이지 PNG 완성 — 쿠팡·네이버 등에 그대로 업로드 가능.
            </Text>
        </Card>
    );
}
