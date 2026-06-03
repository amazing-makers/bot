'use client';

import { useState } from 'react';
import { Paper, Group, Text, Button, Code, Badge, Stack, CopyButton, ActionIcon, ThemeIcon, List } from '@mantine/core';
import { IconDeviceLaptop, IconCopy, IconCheck, IconRefresh, IconChevronDown } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { rotateDesktopTokenAction } from '@/app/actions/desktop';

export function DesktopConnect({ initialToken, pending }: { initialToken: string; pending: number }) {
  const [token, setToken] = useState(initialToken);
  const [open, setOpen] = useState(false);
  const [rotating, setRotating] = useState(false);

  async function rotate() {
    if (!confirm('토큰을 재발급하면 기존 토큰은 즉시 무효화됩니다. 계속할까요?')) return;
    setRotating(true);
    try {
      const r = await rotateDesktopTokenAction();
      if (r.ok && r.token) {
        setToken(r.token);
        notifications.show({ message: '새 토큰이 발급되었습니다. config.json 을 업데이트하세요.', color: 'teal' });
      } else notifications.show({ message: r.error || '실패', color: 'red' });
    } finally {
      setRotating(false);
    }
  }

  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs">
          <ThemeIcon variant="light" color="indigo" size={34} radius="md"><IconDeviceLaptop size={20} /></ThemeIcon>
          <div>
            <Text fw={600}>데스크톱 연결 (로컬 폴더 자동 업로드)</Text>
            <Text size="xs" c="dimmed">내 PC 폴더에 사진을 넣으면 자동 업로드 → 'local' 소스 자동화가 발행</Text>
          </div>
        </Group>
        <Group gap="xs">
          {pending > 0 && <Badge color="indigo" variant="light">대기 {pending}</Badge>}
          <Button size="xs" variant="subtle" rightSection={<IconChevronDown size={14} />} onClick={() => setOpen((v) => !v)}>
            {open ? '접기' : '설정 보기'}
          </Button>
        </Group>
      </Group>

      {open && (
        <Stack gap="sm" mt="md">
          <div>
            <Text size="sm" fw={500} mb={4}>1) 내 토큰 (config.json 에 붙여넣기)</Text>
            <Group gap="xs" wrap="nowrap">
              <Code style={{ flex: 1, overflow: 'auto', whiteSpace: 'nowrap' }}>{token}</Code>
              <CopyButton value={token}>
                {({ copied, copy }) => (
                  <ActionIcon variant="light" color={copied ? 'teal' : 'gray'} onClick={copy} title="복사">
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                )}
              </CopyButton>
              <ActionIcon variant="light" color="orange" onClick={rotate} loading={rotating} title="재발급"><IconRefresh size={16} /></ActionIcon>
            </Group>
          </div>
          <div>
            <Text size="sm" fw={500} mb={4}>2) 에이전트 실행 (Node 18+ 필요)</Text>
            <List size="xs" spacing={4} c="dimmed">
              <List.Item><b>tools/desktop-agent</b> 폴더의 <Code>config.example.json</Code> 을 <Code>config.json</Code> 으로 복사</List.Item>
              <List.Item><Code>token</Code>(위 값) · <Code>folder</Code>(감시할 폴더 경로) 입력</List.Item>
              <List.Item>터미널에서 <Code>node amakers-agent.mjs</Code> 실행 → 폴더에 사진을 넣으면 자동 업로드</List.Item>
            </List>
          </div>
          <Text size="xs" c="dimmed">3) 아래 "새 자동화"에서 소스를 <b>로컬(데스크톱)</b> 으로 만들면, 올라온 사진을 주기마다 하나씩 발행합니다.</Text>
        </Stack>
      )}
    </Paper>
  );
}
