'use client';

import { Container, Paper, Stack, TextInput, PasswordInput, Button, Title, Text, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const form = useForm({
        initialValues: { email: '', password: '' },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/callback/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    email: values.email,
                    password: values.password,
                    redirect: 'false',
                    callbackUrl: '/',
                }).toString(),
            });
            if (res.ok || res.redirected) {
                router.push('/');
                router.refresh();
            } else {
                setError('이메일 또는 비밀번호가 올바르지 않거나 관리자 권한이 없습니다.');
            }
        } catch {
            setError('로그인 실패 — 네트워크 오류');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container size="xs" py={80}>
            <Paper withBorder shadow="md" p={32} radius="md">
                <Stack gap="md">
                    <Box>
                        <Title order={2}>🔐 Amakers Admin</Title>
                        <Text c="dimmed" size="sm">슈퍼관리자 로그인</Text>
                    </Box>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="sm">
                            <TextInput
                                label="이메일"
                                placeholder="help@amakers.co.kr"
                                required
                                {...form.getInputProps('email')}
                            />
                            <PasswordInput
                                label="비밀번호"
                                required
                                {...form.getInputProps('password')}
                            />
                            {error && <Text c="red" size="sm">{error}</Text>}
                            <Button type="submit" loading={submitting} fullWidth>
                                로그인
                            </Button>
                        </Stack>
                    </form>
                    <Text c="dimmed" size="xs">
                        ADMIN_EMAILS 환경변수에 등록된 이메일만 접근 가능합니다.
                    </Text>
                </Stack>
            </Paper>
        </Container>
    );
}
