import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
    Container, Title, Text, Button, Stack, Group, ThemeIcon, SimpleGrid, Card, Badge,
} from '@mantine/core';
import { IconBrandInstagram, IconCalendarTime, IconSparkles, IconSend } from '@tabler/icons-react';

export default async function LandingPage() {
    const session = await auth();
    if ((session?.user as any)?.id) redirect('/dashboard');

    const features = [
        { icon: IconSend, title: 'Graph API 직접 발행', desc: 'Business 계정 연결 → 에이전트 없이 서버에서 바로 발행.' },
        { icon: IconCalendarTime, title: '예약 발행', desc: '황금 시간대에 자동 게시 (예약 큐).' },
        { icon: IconSparkles, title: 'AI 캡션', desc: '주제만 입력하면 해시태그까지 자동 생성.' },
    ];

    return (
        <Container size="md" my={80}>
            <Stack align="center" gap="lg" mb={50}>
                <ThemeIcon variant="gradient" gradient={{ from: 'grape', to: 'orange' }} size={72} radius="lg">
                    <IconBrandInstagram size={40} />
                </ThemeIcon>
                <Badge variant="light" color="grape" size="lg">amakers · instabot</Badge>
                <Title order={1} ta="center">인스타그램 자동화봇</Title>
                <Text c="dimmed" ta="center" size="lg" maw={520}>
                    캡션 작성부터 예약·발행까지. 마케팅봇에서 분리한 인스타 전용 자동화 도구.
                </Text>
                <Group>
                    <Button component="a" href="/login" size="md" color="grape">시작하기</Button>
                    <Button component="a" href="/dashboard" size="md" variant="light" color="grape">대시보드</Button>
                </Group>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                {features.map((f) => (
                    <Card key={f.title} withBorder p="lg" radius="md">
                        <ThemeIcon variant="light" color="grape" size={44} radius="md" mb="sm">
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
