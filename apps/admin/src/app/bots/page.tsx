import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { Title, Text, Stack, Paper, SimpleGrid, Badge, Group, ThemeIcon } from '@mantine/core';
import { IconRobot, IconBolt, IconSpeakerphone } from '@tabler/icons-react';

export default async function BotsPage() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email, (session.user as any).role)) redirect('/login');

    const bots = [
        {
            kind: 'marketing',
            title: '마케팅봇',
            description: 'SNS·블로그 자동 발행, AI 캡션·이미지 생성, 시리즈 자동 운영',
            domain: 'marketingbot.amakers.co.kr',
            appPath: 'apps/marketing (예정) — 현재는 c:\\marketingbot',
            status: 'LIVE',
            icon: IconSpeakerphone,
            color: 'violet',
        },
        {
            kind: 'design',
            title: '디자인봇',
            description: 'AI 디자인 템플릿 자동 생성 + 캔버스 에디터 (Figma·Canva 류)',
            domain: 'designbot.amakers.co.kr',
            appPath: 'apps/design',
            status: 'PLANNED',
            icon: IconRobot,
            color: 'blue',
        },
        {
            kind: 'mockup',
            title: '목업봇',
            description: '인쇄 출력 전 목업 시뮬레이션 (티셔츠·머그·포스터·명함 등)',
            domain: 'mockupbot.amakers.co.kr',
            appPath: 'apps/mockup',
            status: 'PLANNED',
            icon: IconBolt,
            color: 'teal',
        },
    ];

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Title order={2}>🤖 봇 레지스트리</Title>
                <Text c="dimmed" size="sm">멀티봇 플랫폼 — 각 봇은 별도 서브도메인 + 별도 Vercel 프로젝트로 배포</Text>
            </Stack>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    {bots.map(b => (
                        <Paper key={b.kind} withBorder p="lg" radius="md">
                            <Group gap="sm" mb="sm" justify="space-between">
                                <Group gap="sm">
                                    <ThemeIcon size={36} radius="md" variant="light" color={b.color}>
                                        <b.icon size={20} />
                                    </ThemeIcon>
                                    <Stack gap={0}>
                                        <Text fw={700}>{b.title}</Text>
                                        <Text size="xs" c="dimmed">{b.kind}</Text>
                                    </Stack>
                                </Group>
                                <Badge color={b.status === 'LIVE' ? 'teal' : 'gray'} variant="light">{b.status}</Badge>
                            </Group>
                            <Text size="sm" mb="sm">{b.description}</Text>
                            <Stack gap={2}>
                                <Group gap={4}><Text size="xs" c="dimmed" fw={600}>🌐 도메인:</Text><Text size="xs">{b.domain}</Text></Group>
                                <Group gap={4}><Text size="xs" c="dimmed" fw={600}>📂 코드:</Text><Text size="xs">{b.appPath}</Text></Group>
                            </Stack>
                        </Paper>
                    ))}
                </SimpleGrid>

                <Paper withBorder p="md" radius="md" bg="blue.0">
                    <Text fw={700} size="sm" mb={4}>💡 새 봇 추가 방법</Text>
                    <Text size="xs">
                        1. <code>apps/&lt;bot-name&gt;/</code> 디렉토리 생성<br />
                        2. <code>package.json</code> 에 <code>@amakers/auth, @amakers/db, @amakers/ui</code> 의존성 추가<br />
                        3. Vercel 에 새 프로젝트 등록 + 도메인 <code>&lt;bot-name&gt;.amakers.co.kr</code> 매핑<br />
                        4. <code>packages/types/src/index.ts</code> 의 <code>BotKind</code> 에 추가
                    </Text>
            </Paper>
        </Stack>
    );
}
