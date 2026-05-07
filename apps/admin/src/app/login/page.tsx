'use client';

import { Container, Paper, Stack, TextInput, PasswordInput, Button, Title, Text, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

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
            const res = await signIn('credentials', {
                email: values.email,
                password: values.password,
                redirect: false,
            });
            if (res?.error) {
                setError('이메일 또는 비밀번호가 올바르지 않거나 관리자 권한이 없습니다.');
            } else if (res?.ok) {
                router.push('/');
                router.refresh();
            } else {
                setError('로그인 실패 — 알 수 없는 오류');
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
                                placeholder="admin@amakers.co.kr"
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
                        User.role = ADMIN 또는 ADMIN_EMAILS 화이트리스트 사용자만 접근 가능합니다.
                    </Text>
                </Stack>
            </Paper>
        </Container>
    );
}
