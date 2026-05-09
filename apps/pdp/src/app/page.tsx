'use client';

import { useState } from 'react';
import {
    AppShell, Container, Title, Text, TextInput, Button, Stack, Group, Card,
    Badge, ActionIcon, SimpleGrid, Image, Anchor, Box, Paper, ThemeIcon, Divider,
} from '@mantine/core';
import {
    IconSparkles, IconLink, IconDownload, IconLanguage, IconWand,
    IconBrandInstagram, IconShoppingBag, IconWorld, IconRocket,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface ExtractedImage {
    url: string;
    alt?: string;
    type: 'main' | 'detail';
}

export default function HomePage() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<ExtractedImage[]>([]);

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
                                        <Card key={i} withBorder p="xs" radius="sm">
                                            <Image
                                                src={img.url}
                                                alt={img.alt || `image ${i + 1}`}
                                                radius="sm"
                                                fit="cover"
                                                h={150}
                                                fallbackSrc="https://placehold.co/200x150?text=loading"
                                            />
                                            <Group gap={4} mt="xs">
                                                <Badge size="xs" variant="light" color={img.type === 'main' ? 'blue' : 'gray'}>
                                                    {img.type === 'main' ? '대표' : '상세'}
                                                </Badge>
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
        </AppShell>
    );
}
