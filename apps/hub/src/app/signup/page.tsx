'use client';

import { useState } from 'react';
import {
  Container, Paper, Title, Text, TextInput, PasswordInput, Button, Stack, Anchor, Alert, Group, ThemeIcon, List,
} from '@mantine/core';
import { IconBolt, IconAlertCircle, IconGift } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import { notifications } from '@mantine/notifications';
import { registerUser } from '@/app/actions/auth-actions';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    const res = await registerUser({ email, password, name });
    if (!res.ok) {
      setLoading(false);
      setErr(res.error || '가입에 실패했습니다.');
      return;
    }

    // 가입 성공 → 바로 로그인
    const r = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (r?.error) {
      notifications.show({ title: '가입 완료', message: '로그인 페이지에서 로그인해 주세요.', color: 'blue' });
      window.location.href = '/login';
      return;
    }
    notifications.show({ title: '환영합니다!', message: 'Amakers 허브에 오신 것을 환영합니다.', color: 'grape' });
    window.location.href = '/';
  };

  return (
    <Container size={440} my={64}>
      <Stack gap="md" align="center" mb="lg">
        <ThemeIcon variant="gradient" gradient={{ from: 'blue', to: 'grape' }} size={56} radius="md">
          <IconBolt size={32} />
        </ThemeIcon>
        <Title order={2} ta="center">Amakers 가입</Title>
      </Stack>

      <Paper withBorder shadow="md" p={30} radius="md">
        <Alert color="grape" variant="light" icon={<IconGift size={16} />} mb="md">
          가입은 <b>무료</b>예요. 한 번 가입하면 인스타·블로그 등 모든 자동화 도구를 SSO로 바로 사용합니다.
        </Alert>
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="이름 (선택)"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <TextInput
              label="이메일"
              placeholder="hello@amakers.co.kr"
              required
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <PasswordInput
              label="비밀번호"
              description="8자 이상"
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
              가입하고 시작하기
            </Button>
          </Stack>
        </form>
      </Paper>

      <Group justify="center" mt="md">
        <Text c="dimmed" size="sm">이미 계정이 있으신가요?</Text>
        <Anchor href="/login" size="sm" fw={600}>로그인</Anchor>
      </Group>
    </Container>
  );
}
