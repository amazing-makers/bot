'use client';

import { useState } from 'react';
import {
    AppShell, Container, Title, Text, TextInput, Button, Stack, Group, Card,
    Badge, ActionIcon, SimpleGrid, Image, Anchor, Box, Paper, ThemeIcon, Divider,
    Modal, Loader, Progress, Textarea, Tooltip,
} from '@mantine/core';
import {
    IconSparkles, IconLink, IconDownload, IconLanguage, IconWand,
    IconShoppingBag, IconWorld, IconRocket, IconPhoto, IconCheck, IconArrowsLeftRight,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface ExtractedImage {
    url: string;
    alt?: string;
    type: 'main' | 'detail';
}

interface RegionResult {
    bboxX: number;
    bboxY: number;
    bboxW: number;
    bboxH: number;
    originalText: string;
    translatedText: string;
    sourceLanguage?: string;
    originalIndex: number;
}

interface ProcessResult {
    outputUrl: string;
    regions: RegionResult[];
    creditsUsed: number;
    balanceAfter?: number;
    message?: string;
}

export default function HomePage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<ExtractedImage[]>([]);

    // Phase 1.2 — 이미지 처리 modal
    const [activeImage, setActiveImage] = useState<ExtractedImage | null>(null);
    const [processStep, setProcessStep] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
    const [processProgress, setProcessProgress] = useState(0);
    const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
    const [processError, setProcessError] = useState<string>('');

    const handleProcess = async (img: ExtractedImage) => {
        setActiveImage(img);
        setProcessStep('processing');
        setProcessProgress(10);
        setProcessResult(null);
        setProcessError('');

        // 진행 progress 단계 — 실제 API 가 한 번에 끝나서 단계는 시각적
        const stepLabels = [10, 25, 50, 80];
        let stepIdx = 0;
        const progressTimer = setInterval(() => {
            if (stepIdx < stepLabels.length) {
                setProcessProgress(stepLabels[stepIdx]);
                stepIdx++;
            }
        }, 4000);

        try {
            const r = await fetch('/api/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: img.url }),
            });
            const data = await r.json();
            clearInterval(progressTimer);
            if (!r.ok) throw new Error(data.error || '처리 실패');
            setProcessResult(data);
            setProcessProgress(100);
            setProcessStep('done');
            notifications.show({
                title: '✨ 한국어 합성 완료',
                message: `${data.regions?.length || 0}개 텍스트 영역 처리 (${data.creditsUsed || 0} credits 사용)`,
                color: 'teal',
            });
        } catch (e: any) {
            clearInterval(progressTimer);
            setProcessStep('error');
            setProcessError(e?.message || '알 수 없는 오류');
            notifications.show({ title: '처리 실패', message: e?.message || '오류', color: 'red' });
        }
    };

    const closeProcessModal = () => {
        setActiveImage(null);
        setProcessStep('idle');
        setProcessProgress(0);
        setProcessResult(null);
        setProcessError('');
    };

    const handleExtract = async () => {
        if (!url.trim()) {
            notifications.show({ color: 'orange', message: 'URL 을 입력해주세요' });
            return;
        }
        setLoading(true);
        try {
            const r = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || '추출 실패');
            setImages(data.images || []);
            notifications.show({
                title: '✅ 이미지 추출 완료',
                message: `${data.images?.length || 0}개 이미지를 가져왔어요. 각 이미지를 클릭해 글자 제거 + 한국어 합성을 진행하세요.`,
                color: 'teal',
            });
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '추출 실패', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size="lg" radius="md">
                                <IconWand size={20} />
                            </ThemeIcon>
                            <Title order={3}>pdpbot</Title>
                            <Badge variant="light" color="violet" size="sm">Phase 1 MVP</Badge>
                        </Group>
                        <Group gap="md">
                            <Anchor href="#workflow" size="sm" c="dimmed">사용 흐름</Anchor>
                            <Anchor href="#pricing" size="sm" c="dimmed">가격</Anchor>
                            <Button variant="subtle" size="xs">로그인</Button>
                        </Group>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="lg">
                    {/* Hero */}
                    <Paper p="xl" radius="lg" mb="xl"
                        style={{ background: 'linear-gradient(135deg, var(--mantine-color-violet-1), var(--mantine-color-pink-1))' }}
                    >
                        <Stack gap="md" align="center" ta="center">
                            <Badge size="lg" variant="filled" color="violet">8시간 → 5분</Badge>
                            <Title order={1} size={48} fw={900}>
                                상세페이지 자동화봇
                            </Title>
                            <Text size="xl" c="dimmed" maw={700}>
                                쿠팡·타오바오·1688·아마존 URL 1개 입력 → 이미지 안 글자 자동 제거 → 한국어 번역 + 디자인 어울리는 합성 → 다운로드.
                            </Text>
                            <Group gap="xs" mt="sm">
                                <Badge variant="light" leftSection={<IconShoppingBag size={12} />}>쿠팡</Badge>
                                <Badge variant="light" leftSection={<IconWorld size={12} />}>타오바오</Badge>
                                <Badge variant="light" leftSection={<IconWorld size={12} />}>1688</Badge>
                                <Badge variant="light" leftSection={<IconWorld size={12} />}>네이버 스마트스토어</Badge>
                                <Badge variant="light" leftSection={<IconWorld size={12} />}>아마존</Badge>
                            </Group>
                        </Stack>
                    </Paper>

                    {/* URL 입력 */}
                    <Card withBorder shadow="md" p="lg" radius="md" mb="xl">
                        <Stack gap="sm">
                            <Group gap="xs">
                                <ThemeIcon variant="light" color="violet"><IconLink size={18} /></ThemeIcon>
                                <Text fw={700}>1단계: 상품 URL 입력</Text>
                            </Group>
                            <Group gap="xs">
                                <TextInput
                                    placeholder="https://item.taobao.com/... 또는 https://www.coupang.com/..."
                                    value={url}
                                    onChange={(e) => setUrl(e.currentTarget.value)}
                                    style={{ flex: 1 }}
                                    size="md"
                                />
                                <Button
                                    onClick={handleExtract}
                                    loading={loading}
                                    leftSection={<IconRocket size={16} />}
                                    size="md"
                                    color="violet"
                                >
                                    이미지 추출
                                </Button>
                            </Group>
                            <Text size="xs" c="dimmed">
                                상품 페이지 URL 을 그대로 붙여넣으세요. 쿠팡·타오바오·1688·아마존·네이버 등 자동 감지.
                            </Text>
                        </Stack>
                    </Card>

                    {/* 결과 갤러리 */}
                    {images.length > 0 && (
                        <Card withBorder shadow="md" p="lg" radius="md" mb="xl">
                            <Stack gap="sm">
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <ThemeIcon variant="light" color="teal"><IconDownload size={18} /></ThemeIcon>
                                        <Text fw={700}>2단계: 처리할 이미지 선택 ({images.length}장)</Text>
                                    </Group>
                                    <Button variant="light" leftSection={<IconLanguage size={16} />}>
                                        모든 이미지 한국어 합성
                                    </Button>
                                </Group>
                                <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }}>
                                    {images.map((img, i) => (
                                        <Card
                                            key={i}
                                            withBorder
                                            p="xs"
                                            radius="sm"
                                            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                            onClick={() => handleProcess(img)}
                                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                                        >
                                            <Image
                                                src={img.url}
                                                alt={img.alt || `image ${i + 1}`}
                                                radius="sm"
                                                fit="cover"
                                                h={150}
                                                fallbackSrc="https://placehold.co/200x150?text=loading"
                                            />
                                            <Group gap={4} mt="xs" justify="space-between">
                                                <Badge size="xs" variant="light" color={img.type === 'main' ? 'blue' : 'gray'}>
                                                    {img.type === 'main' ? '대표' : '상세'}
                                                </Badge>
                                                <Tooltip label="클릭 → 글자 제거 + 한국어 합성">
                                                    <Badge size="xs" variant="filled" color="violet" leftSection={<IconWand size={10} />}>
                                                        처리
                                                    </Badge>
                                                </Tooltip>
                                            </Group>
                                        </Card>
                                    ))}
                                </SimpleGrid>
                            </Stack>
                        </Card>
                    )}

                    {/* 사용 흐름 — Phase 1 가이드 */}
                    <Box id="workflow" pt="xl">
                        <Title order={2} mb="md">5분 워크플로우</Title>
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                            {[
                                { icon: IconLink, title: 'URL 붙여넣기', desc: '쿠팡·타오바오 등 상품 페이지 URL', color: 'violet' },
                                { icon: IconSparkles, title: '글자 자동 탐지', desc: 'GPT-4 Vision 으로 이미지 안 모든 텍스트 추출', color: 'pink' },
                                { icon: IconWand, title: '인페인팅 + 합성', desc: 'FLUX Pro 로 글자 자연스럽게 제거 → Claude 가 한국어 번역', color: 'blue' },
                                { icon: IconDownload, title: '다운로드', desc: '개별 PNG 또는 전체 ZIP', color: 'teal' },
                            ].map((step, i) => (
                                <Card key={i} withBorder p="md" radius="md">
                                    <ThemeIcon variant="light" color={step.color} size="xl" radius="md" mb="sm">
                                        <step.icon size={24} />
                                    </ThemeIcon>
                                    <Text fw={700} mb={4}>{i + 1}. {step.title}</Text>
                                    <Text size="sm" c="dimmed">{step.desc}</Text>
                                </Card>
                            ))}
                        </SimpleGrid>
                    </Box>

                    <Divider my="xl" />
                    <Text ta="center" c="dimmed" size="sm" mb="xl">
                        Phase 2: 키워드·상품 분석 · Phase 3: 신규 상세페이지 AI 자동 생성 · Phase 4: 채널 자동 업로드
                    </Text>
                </Container>
            </AppShell.Main>

            {/* 이미지 처리 Modal */}
            <Modal
                opened={!!activeImage}
                onClose={closeProcessModal}
                size="xl"
                title={
                    <Group gap="xs">
                        <ThemeIcon variant="light" color="violet"><IconWand size={16} /></ThemeIcon>
                        <Text fw={700}>이미지 글자 제거 + 한국어 합성</Text>
                    </Group>
                }
                closeOnClickOutside={processStep !== 'processing'}
                withCloseButton={processStep !== 'processing'}
            >
                {activeImage && (
                    <Stack gap="md">
                        {processStep === 'processing' && (
                            <Stack gap="sm" p="md">
                                <Group gap="xs">
                                    <Loader size="sm" color="violet" />
                                    <Text size="sm" fw={600}>처리 중... (1-3분 소요)</Text>
                                </Group>
                                <Progress value={processProgress} color="violet" animated striped />
                                <Stack gap={4}>
                                    {[
                                        { at: 10, label: '1️⃣ 원본 이미지 R2 백업' },
                                        { at: 25, label: '2️⃣ GPT-4 Vision 으로 텍스트 영역 탐지' },
                                        { at: 50, label: '3️⃣ Claude Opus 한국어 번역' },
                                        { at: 80, label: '4️⃣ FLUX 1.1 Pro 인페인팅 + 합성' },
                                    ].map((s) => (
                                        <Text key={s.at} size="xs" c={processProgress >= s.at ? 'teal.7' : 'dimmed'}>
                                            {processProgress >= s.at ? '✓' : '○'} {s.label}
                                        </Text>
                                    ))}
                                </Stack>
                            </Stack>
                        )}

                        {processStep === 'error' && (
                            <Paper withBorder p="md" radius="md" bg="red.0">
                                <Text size="sm" fw={600} c="red.7" mb={4}>처리 실패</Text>
                                <Text size="xs">{processError}</Text>
                                <Button mt="sm" variant="light" color="red" onClick={() => handleProcess(activeImage)}>
                                    다시 시도
                                </Button>
                            </Paper>
                        )}

                        {processStep === 'done' && processResult && (
                            <Stack gap="md">
                                <Group justify="space-between">
                                    <Group gap="xs">
                                        <IconCheck size={18} color="var(--mantine-color-teal-6)" />
                                        <Text fw={600}>완료</Text>
                                        <Badge color="violet" variant="light">{processResult.creditsUsed} credits 사용</Badge>
                                    </Group>
                                    <Button
                                        component="a"
                                        href={processResult.outputUrl}
                                        download="pdpbot-result.png"
                                        target="_blank"
                                        leftSection={<IconDownload size={16} />}
                                        color="teal"
                                    >
                                        PNG 다운로드
                                    </Button>
                                </Group>

                                {/* before / after */}
                                <SimpleGrid cols={{ base: 1, md: 2 }}>
                                    <Stack gap={4}>
                                        <Badge variant="light" color="gray" w="fit-content">원본</Badge>
                                        <Image src={activeImage.url} radius="sm" fit="contain" mah={400} />
                                    </Stack>
                                    <Stack gap={4}>
                                        <Badge variant="filled" color="teal" w="fit-content" leftSection={<IconArrowsLeftRight size={10} />}>
                                            한국어 합성
                                        </Badge>
                                        <Image src={processResult.outputUrl} radius="sm" fit="contain" mah={400} />
                                    </Stack>
                                </SimpleGrid>

                                {/* 번역 결과 list */}
                                {processResult.regions.length > 0 && (
                                    <Paper withBorder p="md" radius="md">
                                        <Text size="sm" fw={700} mb="xs">탐지·번역된 텍스트 ({processResult.regions.length}개)</Text>
                                        <Stack gap={4}>
                                            {processResult.regions.map((r) => (
                                                <Box key={r.originalIndex}>
                                                    <Group gap={6}>
                                                        <Badge size="xs" variant="light">{r.sourceLanguage || '?'}</Badge>
                                                        <Text size="xs" c="dimmed" style={{ flex: 1 }}>{r.originalText}</Text>
                                                    </Group>
                                                    <Text size="sm" fw={500} mt={2}>→ {r.translatedText}</Text>
                                                </Box>
                                            ))}
                                        </Stack>
                                        <Text size="11px" c="dimmed" mt="xs">
                                            ⓘ 번역 수정 + 재합성은 다음 업데이트에서 추가됩니다.
                                        </Text>
                                    </Paper>
                                )}

                                {processResult.message && (
                                    <Text size="xs" c="dimmed">{processResult.message}</Text>
                                )}
                            </Stack>
                        )}
                    </Stack>
                )}
            </Modal>
        </AppShell>
    );
}
