import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
    Container, Title, Text, Button, Stack, Group, ThemeIcon, SimpleGrid, Card, Badge,
} from '@mantine/core';
import { IconArticle, IconCalendarTime, IconSparkles, IconRobot } from '@tabler/icons-react';

export default async function LandingPage() {
    const session = await auth();
    if ((session?.user as any)?.id) redirect('/dashboard');

    const features = [
        { icon: IconCalendarTime, title: '글 작성·예약', desc: '제목·본문을 작성하고 예약 큐에 저장합니다.' },
        { icon: IconRobot, title: '에이전트 발행 (준비 중)', desc: '티스토리는 공개 API가 없어 데스크톱 에이전트로 자동 발행 예정.' },
        { icon: IconSparkles, title: 'AI 글쓰기 (예정)', desc: '주제만 입력하면 제목·본문 초안 자동 생성.' },
    ];

    return (
        <Container size="md" my={80}>
            <Stack align="center" gap="lg" mb={50}>
                <ThemeIcon variant="gradient" gradient={{ from: 'orange', to: 'red' }} size={72} radius="lg">
                    <IconArticle size={40} />
                </ThemeIcon>
                <Badge variant="light" color="orange" size="lg">amakers · TistoryAuto</Badge>
                <Title order={1} ta="center">티스토리 자동화봇</Title>
                <Text c="dimmed" ta="center" size="lg" maw={520}>
                    글 작성부터 예약·발행까지. 마케팅봇에서 분리한 티스토리 전용 자동화 도구.
                </Text>
                <Group>
                    <Button component="a" href="/login" size="md" color="orange">시작하기</Button>
                    <Button component="a" href="/dashboard" size="md" variant="light" color="orange">대시보드</Button>
                </Group>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                {features.map((f) => (
                    <Card key={f.title} withBorder p="lg" radius="md">
                        <ThemeIcon variant="light" color="orange" size={44} radius="md" mb="sm">
                            <f.icon size={24} />
                        </ThemeIcon>
                        <Text fw={700}>{f.title}</Text>
                        <Text size="sm" c="dimmed" mt={4}>{f.desc}</Text>
                    </Card>
                ))}
            </SimpleGrid>
        </Container>
    );
}
