import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { Title, Text, Stack, Paper, SimpleGrid, Badge, Group, ThemeIcon, Box } from '@mantine/core';
import { IconRobot, IconBolt, IconSpeakerphone, IconBrush, IconWand } from '@tabler/icons-react';

const BOTS = [
    {
        kind: 'marketing',
        title: '마케팅봇',
        description: 'SNS·블로그 자동 발행, AI 캡션·이미지 생성, 시리즈 자동 운영. 22개 채널 지원.',
        domain: 'marketingbot.amakers.co.kr',
        appPath: 'apps/marketing (예정) — 현재는 c:\\marketingbot',
        port: 3000,
        status: 'LIVE' as const,
        icon: IconSpeakerphone,
        color: 'violet',
        phase: 'Phase 50+',
    },
    {
        kind: 'pdp',
        title: '상세페이지봇 (pdpbot)',
        description: '타오바오·쿠팡 상품 URL → OCR → 한국어 번역 → FLUX 인페인팅 → 상세페이지 자동 생성.',
        domain: 'pdpbot.amakers.co.kr',
        appPath: 'apps/pdp',
        port: 3200,
        status: 'BETA' as const,
        icon: IconWand,
        color: 'teal',
        phase: 'Phase 3.3 완료',
    },
    {
        kind: 'design',
        title: '디자인봇',
        description: 'Konva 캔버스 에디터 + Claude AI 레이아웃 자동 생성 + FLUX 배경 이미지 + 브랜드 키트. pdpbot 상품 분석 → 자동 광고 디자인 연동.',
        domain: 'designbot.amakers.co.kr',
        appPath: 'apps/design',
        port: 3300,
        status: 'BETA' as const,
        icon: IconBrush,
        color: 'pink',
        phase: 'Phase 4 완료',
    },
    {
        kind: 'mockup',
        title: '목업봇',
        description: '상품 이미지 → FLUX Kontext AI → 티셔츠·머그·포스터·빌보드 목업 자동 생성. 마케팅 콘텐츠 즉시 활용.',
        domain: 'mockupbot.amakers.co.kr',
        appPath: 'apps/mockup',
        port: 3400,
        status: 'PLANNED' as const,
        icon: IconRobot,
        color: 'orange',
        phase: 'Phase 1 개발 중',
    },
];

const STATUS_COLOR = {
    LIVE: 'teal',
    BETA: 'orange',
    PLANNED: 'gray',
} as const;

export default async function BotsPage() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email, (session.user as any).role)) redirect('/login');

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Title order={2}>🤖 봇 레지스트리</Title>
                <Text c="dimmed" size="sm">멀티봇 플랫폼 — 각 봇은 별도 서브도메인 + 별도 Vercel 프로젝트로 배포. 공유 DB + SSO.</Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {BOTS.map(b => (
                    <Paper key={b.kind} withBorder p="lg" radius="md">
                        <Group gap="sm" mb="sm" justify="space-between">
                            <Group gap="sm">
                                <ThemeIcon size={36} radius="md" variant="light" color={b.color}>
                                    <b.icon size={20} />
                                </ThemeIcon>
                                <Stack gap={0}>
                                    <Text fw={700}>{b.title}</Text>
                                    <Text size="xs" c="dimmed">{b.phase}</Text>
                                </Stack>
                            </Group>
                            <Badge color={STATUS_COLOR[b.status]} variant="light">{b.status}</Badge>
                        </Group>
                        <Text size="sm" mb="sm" c="dimmed">{b.description}</Text>
                        <Stack gap={2}>
                            <Group gap={4}><Text size="xs" c="dimmed" fw={600}>🌐</Text><Text size="xs">{b.domain}</Text></Group>
                            <Group gap={4}><Text size="xs" c="dimmed" fw={600}>📂</Text><Text size="xs">{b.appPath}</Text></Group>
                            <Group gap={4}><Text size="xs" c="dimmed" fw={600}>🔌 port:</Text><Text size="xs">{b.port}</Text></Group>
                        </Stack>
                    </Paper>
                ))}
            </SimpleGrid>

            <Paper withBorder p="md" radius="md">
                <Text fw={700} size="sm" mb="xs">💡 새 봇 추가 체크리스트</Text>
                <Box component="ol" style={{ paddingLeft: 20, margin: 0 }}>
                    {[
                        '`apps/<bot-name>/` 디렉토리 생성 + package.json (포트 할당)',
                        'prisma/schema.prisma — 공유 모델 복사 + 봇 전용 모델 추가',
                        'prisma.config.ts — Prisma 7 CLI datasource.url 설정',
                        'src/auth.ts + NextAuth 설정 (NEXTAUTH_SECRET 공유 → SSO 자동)',
                        'src/lib/credit.ts + withCreditRefund 패턴 복사',
                        'Vercel 신규 프로젝트 + Root Directory = apps/<bot> + 서브도메인 매핑',
                        'packages/types/src/index.ts 의 BotKind 에 추가',
                    ].map((step, i) => (
                        <Text key={i} component="li" size="xs" mb={2}>{step}</Text>
                    ))}
                </Box>
            </Paper>
        </Stack>
    );
}
