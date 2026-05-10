'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Container, Paper, Title, Text, TextInput, PasswordInput, Button, Stack, Anchor, Alert, Group, ThemeIcon,
} from '@mantine/core';
import { IconWand, IconAlertCircle } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import { notifications } from '@mantine/notifications';

function LoginInner() {
    const router = useRouter();
    const sp = useSearchParams();
    const callbackUrl = sp.get('callbackUrl') || '/dashboard';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // SSO 자동 — pdpbot.amakers.co.kr 에서 다른 봇과 같은 도메인 쿠키 공유.
    // 다른 봇에서 이미 로그인했으면 useEffect 가 곧장 dashboard 로 보낼 수도.
    useEffect(() => {
        // (옵션) 자동 redirect 로직은 추후 — 일단 로그인 폼 우선.
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErr(null);
        const r = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });
        setLoading(false);
        if (r?.error) {
            setErr('이메일 또는 비밀번호가 일치하지 않습니다.');
            return;
        }
        notifications.show({ title: '로그인 성공', message: '대시보드로 이동합니다.', color: 'teal' });
        // hard navigation — 새 세션 쿠키가 server component 까지 반영되도록.
        window.location.href = callbackUrl;
    };

    return (
        <Container size={420} my={80}>
            <Stack gap="md" align="center" mb="xl">
                <ThemeIcon variant="gradient" gradient={{ from: 'violet', to: 'pink' }} size={56} radius="md">
                    <IconWand size={32} />
                </ThemeIcon>
                <Title order={2} ta="center">pdpbot</Title>
                <Text c="dimmed" ta="center" size="sm">
                    상세페이지 자동화봇 — 쿠팡·타오바오 URL 1개로 한국어 상세페이지 5분 완성.
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
                        <Button type="submit" loading={loading} fullWidth color="violet">
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
