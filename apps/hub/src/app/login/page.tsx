'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Container, Paper, Title, Text, TextInput, PasswordInput, Button, Stack, Anchor, Alert, Group, ThemeIcon,
} from '@mantine/core';
import { IconBolt, IconAlertCircle } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import { notifications } from '@mantine/notifications';

function LoginInner() {
  const sp = useSearchParams();
  const callbackUrl = sp.get('callbackUrl') || '/';
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
    notifications.show({ title: '로그인 성공', message: '허브로 이동합니다.', color: 'blue' });
    window.location.href = callbackUrl;
  };

  return (
    <Container size={420} my={80}>
      <Stack gap="md" align="center" mb="xl">
        <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'grape' }} size={56} radius="md">
          <IconBolt size={32} />
        </ThemeIcon>
        <Title order={2} ta="center">Amakers 허브</Title>
        <Text c="dimmed" ta="center" size="sm">
          한 번 로그인으로 모든 자동화 도구를 — 통합 크레딧으로.
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
            <Button type="submit" loading={loading} fullWidth>
              로그인
            </Button>
          </Stack>
        </form>
      </Paper>

      <Group justify="center" mt="md">
        <Text c="dimmed" size="sm">계정이 없으신가요?</Text>
        <Anchor href="/signup" size="sm" fw={600}>가입하기</Anchor>
      </Group>
      <Text c="dimmed" size="xs" ta="center" mt="xs">
        ⓘ amakers 다른 봇 계정으로도 그대로 로그인됩니다 (SSO).
      </Text>
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
