'use client';

import { useState } from 'react';
import { Paper, Group, Text, Button, TextInput, Code, Stack, ThemeIcon, CopyButton, ActionIcon, List } from '@mantine/core';
import { IconDeviceLaptop, IconCopy, IconCheck, IconRefresh, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { connectNaverAction, rotateNaverTokenAction } from '@/app/actions/naver';

export function NaverConnect({ initialToken }: { initialToken: string }) {
  const [blogId, setBlogId] = useState('');
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);

  async function connect() {
    if (!blogId.trim()) return notifications.show({ message: '네이버 블로그 ID를 입력하세요', color: 'red' });
    setBusy(true);
    try {
      const r = await connectNaverAction(blogId.trim());
      if (r.ok) { notifications.show({ title: '연결됨', message: `네이버 블로그 @${r.username} 연결`, color: 'teal' }); setBlogId(''); }
      else notifications.show({ message: r.error || '실패', color: 'red' });
    } finally { setBusy(false); }
  }
  async function rotate() {
    if (!confirm('토큰을 재발급하면 기존 토큰이 무효화됩니다. 계속할까요?')) return;
    const r = await rotateNaverTokenAction();
    if (r.ok && r.token) { setToken(r.token); notifications.show({ message: '새 토큰 발급됨 — .env 업데이트하세요', color: 'teal' }); }
  }

  return (
    <Paper withBorder radius="md" p="md">
      <Group gap="xs" mb="sm">
        <ThemeIcon variant="light" color="green" size={34} radius="md"><IconDeviceLaptop size={20} /></ThemeIcon>
        <div>
          <Text fw={700}>네이버 블로그 (데스크톱 에이전트)</Text>
          <Text size="xs" c="dimmed">네이버는 공식 API가 없어 PC 에이전트가 자동 발행합니다.</Text>
        </div>
      </Group>

      <Stack gap="sm">
        <Group gap="xs" align="flex-end">
          <TextInput flex={1} label="네이버 블로그 ID" placeholder="blog.naver.com/<여기>" value={blogId} onChange={(e) => setBlogId(e.currentTarget.value)} />
          <Button leftSection={<IconPlus size={16} />} loading={busy} onClick={connect}>연결</Button>
        </Group>

        <div>
          <Text size="sm" fw={500} mb={4}>에이전트 토큰 (naver-agent .env 에 입력)</Text>
          <Group gap="xs" wrap="nowrap">
            <Code style={{ flex: 1, overflow: 'auto', whiteSpace: 'nowrap' }}>{token}</Code>
            <CopyButton value={token}>
              {({ copied, copy }) => (
                <ActionIcon variant="light" color={copied ? 'teal' : 'gray'} onClick={copy}>{copied ? <IconCheck size={16} /> : <IconCopy size={16} />}</ActionIcon>
              )}
            </CopyButton>
            <ActionIcon variant="light" color="orange" onClick={rotate}><IconRefresh size={16} /></ActionIcon>
          </Group>
        </div>

        <div>
          <Text size="sm" fw={500} mb={4}>에이전트 실행 (Node 20+)</Text>
          <List size="xs" spacing={4} c="dimmed">
            <List.Item><b>naver-agent</b> 폴더에서 <Code>npm i</Code> → <Code>npx playwright install chromium</Code></List.Item>
            <List.Item><Code>.env</Code> 에 위 토큰 입력 → <Code>node agent.mjs login</Code> (네이버 1회 로그인)</List.Item>
            <List.Item><Code>node agent.mjs start</Code> → 예약·발행 글을 자동으로 네이버에 게시</List.Item>
          </List>
        </div>
      </Stack>
    </Paper>
  );
}
