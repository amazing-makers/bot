'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Container, Paper, Title, Text, TextInput, PasswordInput, Button, Stack, Anchor, Alert, Group, ThemeIcon,
} from '@mantine/core';
import { IconArticle, IconAlertCircle } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import { notifications } from '@mantine/notifications';

function LoginInner() {
    const sp = useSearchParams();
    const callbackUrl = sp.get('callbackUrl') || '/dashboard';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErr(null);
        const r = await signIn('credentials', { email, password, redirect: false });
        setLoading(false);
        if (r?.error) {
            setErr('이메일 또는 비밀번호가 일치하지 않습니다.');
            return;
        }
        notifications.show({ title: '로그인 성공', message: '대시보드로 이동합니다.', color: 'blue' });
        window.location.href = callbackUrl;
    };

    return (
        <Container size={420} my={80}>
            <Stack gap="md" align="center" mb="xl">
                <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'cyan' }} size={56} radius="md">
                    <IconArticle size={32} />
                </ThemeIcon>
                <Title order={2} ta="center">NaverBlogAuto</Title>
                <Text c="dimmed" ta="center" size="sm">
                    블로그 자동화봇 — 글 작성부터 예약·발행까지 한 번에.
                </Text>
            </Stack>

            <Paper withBorder shadow="md" p={30} radius="md">
                <form onSubmit={handleSubmit}>
                    <Stack>
                        <TextInput
                            label="이메일"
                            placeholder="hello@amakers.co.kr"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.currentTarget.value)}
                        />
                        <PasswordInput
                            label="비밀번호"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                        />
                        {err && (
                            <Alert color="red" icon={<IconAlertCircle size={16} />} variant="light">
                                {err}
                            </Alert>
                        )}
                        <Button type="submit" loading={loading} fullWidth color="blue">
                            로그인
                        </Button>
                    </Stack>
                </form>
            </Paper>

            <Text c="dimmed" size="xs" ta="center" mt="md">
                ⓘ 마케팅봇 등 amakers 다른 봇의 계정으로 그대로 로그인됩니다 (SSO).
            </Text>
            <Group justify="center" mt="md">
                <Anchor href="https://marketingbot.amakers.co.kr/register" target="_blank" rel="noreferrer" size="sm">
                    아직 계정이 없으신가요? 가입하기 ↗
                </Anchor>
            </Group>
        </Container>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginInner />
        </Suspense>
    );
}
