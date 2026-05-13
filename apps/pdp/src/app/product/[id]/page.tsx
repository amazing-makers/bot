import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
    AppShell, Container, Title, Text, Stack, Group, Card, Badge, Button, SimpleGrid, ThemeIcon,
    Image, Anchor, Paper, Box, Divider,
} from '@mantine/core';
import { IconWand, IconDownload, IconArrowLeft, IconExternalLink, IconCoin } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import ProductAnalysis from '@/components/ProductAnalysis';
import RecomposeForm from '@/components/RecomposeForm';
import GeneratedPageOutline from '@/components/GeneratedPageOutline';
import CreateDesignButton from '@/components/CreateDesignButton';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login');

    const { id } = await params;
    const product = await prisma.product.findFirst({
        where: { id, userId },
        include: {
            images: {
                orderBy: { orderIdx: 'asc' },
                include: {
                    textRegions: true,
                    outputs: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
            },
            outputImages: { orderBy: { createdAt: 'asc' } },
        },
    });
    if (!product) notFound();

    const totalCredits = product.outputImages.reduce((sum, o) => sum + (o.creditsUsed || 0), 0);

    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Container size="xl" h="100%">
                    <Group h="100%" justify="space-between">
                        <Group gap="xs">
                            <Anchor component={Link} href="/dashboard" underline="never" c="inherit">
                                <Group gap="xs">
                                    <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size="lg" radius="md">
                                        <IconWand size={20} />
                                    </ThemeIcon>
                                    <Title order={3}>pdpbot</Title>
                                </Group>
                            </Anchor>
                        </Group>
                    </Group>
                </Container>
            </AppShell.Header>

            <AppShell.Main>
                <Container size="xl">
                    <Group justify="space-between" mb="md">
                        <Group gap="xs">
                            <Button component={Link} href="/dashboard" variant="subtle" size="sm" leftSection={<IconArrowLeft size={14} />}>
                                대시보드
                            </Button>
                            <Title order={3}>{product.title || '(제목 없음)'}</Title>
                            <Badge variant="light">{product.source}</Badge>
                        </Group>
                        <Group gap="xs">
                            {/* Phase 4: designbot 광고 디자인 자동 생성 */}
                            <CreateDesignButton productId={product.id} />

                            {product.outputImages.length > 0 && (
                                <Button
                                    component="a"
                                    href={`/api/products/${product.id}/zip`}
                                    download
                                    leftSection={<IconDownload size={16} />}
                                    color="teal"
                                >
                                    전체 ZIP 다운로드
                                </Button>
                            )}
                            {product.sourceUrl && (
                                <Button
                                    component="a"
                                    href={product.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    variant="light"
                                    leftSection={<IconExternalLink size={14} />}
                                >
                                    원본 사이트
                                </Button>
                            )}
                        </Group>
                    </Group>

                    {/* 메타 정보 */}
                    <Paper withBorder p="md" radius="md" mb="lg">
                        <SimpleGrid cols={{ base: 2, md: 4 }}>
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>처리한 이미지</Text>
                                <Text fw={700} size="xl">
                                    {product.outputImages.length}
                                    <Text span size="sm" c="dimmed"> / {product.images.length}</Text>
                                </Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>사용 credits</Text>
                                <Text fw={700} size="xl" c="violet.7">
                                    <IconCoin size={16} style={{ verticalAlign: 'middle' }} /> {totalCredits.toLocaleString()}
                                </Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>생성일</Text>
                                <Text fw={500} size="sm">{dayjs(product.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
                            </Box>
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>최근 처리</Text>
                                <Text fw={500} size="sm">{dayjs(product.updatedAt).fromNow ? '' : dayjs(product.updatedAt).format('YYYY-MM-DD HH:mm')}</Text>
                            </Box>
                        </SimpleGrid>
                    </Paper>

                    {/* AI 상품 분석 */}
                    <Box mb="lg">
                        <ProductAnalysis
                            productId={product.id}
                            initialAnalysis={(product.metadata as any)?.analysis || null}
                            initialAnalyzedAt={(product.metadata as any)?.analyzedAt || null}
                        />
                    </Box>

                    {/* 신규 상세페이지 outline 자동 생성 (Phase 3.1~3.3) */}
                    <Box mb="lg">
                        <GeneratedPageOutline
                            productId={product.id}
                            initial={(product.metadata as any)?.generatedPage || null}
                            initialComposedPageUrl={(product.metadata as any)?.composedPageUrl || null}
                        />
                    </Box>

                    {/* before / after 갤러리 */}
                    {product.images.length === 0 ? (
                        <Card withBorder p="xl" ta="center">
                            <Text c="dimmed">처리한 이미지가 없습니다.</Text>
                        </Card>
                    ) : (
                        <Stack gap="md">
                            {product.images.map((img, i) => {
                                const out = img.outputs[0];
                                return (
                                    <Card key={img.id} withBorder p="md" radius="md">
                                        <Group justify="space-between" mb="xs">
                                            <Group gap="xs">
                                                <Badge>{i + 1}/{product.images.length}</Badge>
                                                <Badge variant="light">{img.textRegions.length}개 텍스트</Badge>
                                            </Group>
                                            {out && (
                                                <Button
                                                    component="a"
                                                    href={out.r2Url}
                                                    download={`pdpbot-${i + 1}.png`}
                                                    target="_blank"
                                                    size="xs"
                                                    variant="light"
                                                    leftSection={<IconDownload size={12} />}
                                                >
                                                    개별 PNG
                                                </Button>
                                            )}
                                        </Group>
                                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                                            <Stack gap={4}>
                                                <Badge variant="light" color="gray" w="fit-content">원본</Badge>
                                                <Image src={img.r2Url || img.sourceUrl} radius="sm" fit="contain" mah={400} />
                                            </Stack>
                                            <Stack gap={4}>
                                                <Badge variant="filled" color="teal" w="fit-content">한국어 합성</Badge>
                                                {out ? (
                                                    <Image src={out.r2Url} radius="sm" fit="contain" mah={400} />
                                                ) : (
                                                    <Box h={400} bg="gray.0" style={{ borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Text size="sm" c="dimmed">미처리</Text>
                                                    </Box>
                                                )}
                                            </Stack>
                                        </SimpleGrid>
                                        {img.textRegions.length > 0 && (
                                            <>
                                                <Divider my="sm" />
                                                <RecomposeForm
                                                    scrapedImageId={img.id}
                                                    initialRegions={img.textRegions.map(t => ({
                                                        id: t.id,
                                                        bboxX: t.bboxX,
                                                        bboxY: t.bboxY,
                                                        bboxW: t.bboxW,
                                                        bboxH: t.bboxH,
                                                        originalText: t.originalText,
                                                        sourceLanguage: t.sourceLanguage,
                                                        translatedText: t.translatedText,
                                                        userOverride: t.userOverride,
                                                    }))}
                                                    latestOutput={out ? { r2Url: out.r2Url } : undefined}
                                                />
                                            </>
                                        )}
                                    </Card>
                                );
                            })}
                        </Stack>
                    )}
                </Container>
            </AppShell.Main>
        </AppShell>
    );
}
