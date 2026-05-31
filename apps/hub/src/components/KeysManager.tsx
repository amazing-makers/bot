'use client';

import { useState } from 'react';
import {
  Card, Group, Text, Badge, Button, TextInput, Stack, ThemeIcon, Anchor, Alert,
} from '@mantine/core';
import { IconKey, IconCheck, IconTrash, IconExternalLink, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { saveKey, removeKey } from '@/app/actions/keys-actions';

export interface ProviderInfo {
  provider: string;
  label: string;
  issueUrl: string;
  hint: string;
  connected: boolean;
  maskedHint?: string;
}

export function KeysManager({ providers }: { providers: ProviderInfo[] }) {
  return (
    <Stack gap="md">
      {providers.map((p) => (
        <ProviderCard key={p.provider} info={p} />
      ))}
    </Stack>
  );
}

function ProviderCard({ info }: { info: ProviderInfo }) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setErr(null);
    const res = await saveKey(info.provider as any, value);
    setLoading(false);
    if (!res.ok) {
      setErr(res.error || '저장 실패');
      return;
    }
    setValue('');
    notifications.show({ title: '연결됨', message: `${info.label} 키가 검증·저장됐습니다.`, color: 'teal' });
  };

  const handleRemove = async () => {
    setLoading(true);
    await removeKey(info.provider as any);
    setLoading(false);
    notifications.show({ title: '삭제됨', message: `${info.label} 키를 삭제했습니다.`, color: 'gray' });
  };

  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <ThemeIcon variant="light" color={info.connected ? 'teal' : 'gray'} radius="md">
            <IconKey size={18} />
          </ThemeIcon>
          <div>
            <Text fw={700}>{info.label}</Text>
            <Text size="xs" c="dimmed">{info.hint}</Text>
          </div>
        </Group>
        {info.connected ? (
          <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
            연결됨 {info.maskedHint}
          </Badge>
        ) : (
          <Badge color="gray" variant="outline">미연결</Badge>
        )}
      </Group>

      <Group gap="xs" align="flex-end">
        <TextInput
          flex={1}
          label={info.connected ? '키 교체' : 'API 키 입력'}
          placeholder="여기에 키를 붙여넣기"
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          type="password"
        />
        <Button onClick={handleSave} loading={loading} disabled={value.trim().length < 10}>
          {info.connected ? '교체' : '연결'}
        </Button>
        {info.connected && (
          <Button variant="subtle" color="red" onClick={handleRemove} loading={loading} leftSection={<IconTrash size={14} />}>
            삭제
          </Button>
        )}
      </Group>

      {err && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} mt="xs">
          {err}
        </Alert>
      )}

      <Anchor href={info.issueUrl} target="_blank" rel="noreferrer" size="xs" mt="xs" display="inline-block">
        <Group gap={4}>
          무료 키 발급받기 <IconExternalLink size={12} />
        </Group>
      </Anchor>
    </Card>
  );
}
