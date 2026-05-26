import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
    Container, Title, Text, Button, Stack, Group, ThemeIcon, SimpleGrid, Card, Badge,
} from '@mantine/core';
import { IconArticle, IconCalendarTime, IconSparkles, IconSend } from '@tabler/icons-react';

export default async function LandingPage() {
    const session = await auth();
    if ((session?.user as any)?.id) redirect('/dashboard');

    const features = [
        { icon: IconSend, title: 'WordPress 직접 발행', desc: 'REST API + Application Password 로 서버에서 바로 게시.' },
        { icon: IconCalendarTime, title: '예약 발행', desc: '원하는 시각에 자동 게시 (예약 큐).' },
        { icon: IconSparkles, title: 'AI 글쓰기', desc: '주제만 입력하면 제목·본문 초안 자동 생성.' },
    ];

    return (
        <Container size="md" my={80}>
            <Stack align="center" gap="lg" mb={50}>
                <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size={72} radius="lg">
                    <IconArticle size={40} />
                </ThemeIcon>
                <Badge variant="light" color="blue" size="lg">amakers · NaverBlogAuto</Badge>
                <Title order={1} ta="center">블로그 자동화봇</Title>
                <Text c="dimmed" ta="center" size="lg" maw={520}>
                    글 작성부터 예약·발행까지. 마케팅봇에서 분리한 블로그 전용 자동화 도구.
                </Text>
                <Group>
                    <Button component="a" href="/login" size="md" color="blue">시작하기</Button>
                    <Button component="a" href="/dashboard" size="md" variant="light" color="blue">대시보드</Button>
                </Group>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                {features.map((f) => (
                    <Card key={f.title} withBorder p="lg" radius="md">
                        <ThemeIcon variant="light" color="blue" size={44} radius="md" mb="sm">
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
