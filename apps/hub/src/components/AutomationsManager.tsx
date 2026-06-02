'use client';

import { useState, useTransition } from 'react';
import {
  Paper, Stack, Group, Text, Button, TextInput, Textarea, Select, MultiSelect, NumberInput,
  Badge, ActionIcon, Divider, Switch, Box, Alert,
} from '@mantine/core';
import {
  IconPlus, IconPlayerPlay, IconTrash, IconPlayerPause, IconBolt, IconClock, IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  createAutomation, setAutomationPaused, deleteAutomation, runAutomationNow,
  type AutomationListItem,
} from '@/app/actions/automations';

type Accounts = {
  instagram: { id: string; label: string }[];
  blog: { id: string; label: string }[];
  tistory: { id: string; label: string }[];
};

const INTERVAL_PRESETS = [
  { label: '1시간', value: 60 },
  { label: '3시간', value: 180 },
  { label: '6시간', value: 360 },
  { label: '12시간', value: 720 },
  { label: '하루', value: 1440 },
];

function fmt(dt: string | null): string {
  if (!dt) return '-';
  try {
    return new Date(dt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

function statusColor(s: string | null): string {
  return s === 'SUCCESS' ? 'teal' : s === 'FAILED' ? 'red' : s === 'SKIPPED' ? 'yellow' : 'gray';
}

export function AutomationsManager({ accounts, initial }: { accounts: Accounts; initial: AutomationListItem[] }) {
  const [items, setItems] = useState<AutomationListItem[]>(initial);
  const [showForm, setShowForm] = useState(initial.length === 0);
  const [pending, startTransition] = useTransition();

  // form state
  const [name, setName] = useState('');
  const [interval, setInterval] = useState<number>(180);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<string>('info');
  const [length, setLength] = useState<string>('medium');
  const [imagePrompt, setImagePrompt] = useState('');
  const [insta, setInsta] = useState<string[]>([]);
  const [blog, setBlog] = useState<string[]>([]);
  const [tistory, setTistory] = useState<string[]>([]);
  const [startNow, setStartNow] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasAnyAccount = accounts.instagram.length + accounts.blog.length + accounts.tistory.length > 0;

  async function refresh() {
    const { listAutomations } = await import('@/app/actions/automations');
    setItems(await listAutomations());
  }

  async function submit() {
    if (!name.trim()) return notifications.show({ message: '이름을 입력하세요', color: 'red' });
    if (!topic.trim()) return notifications.show({ message: 'AI가 쓸 주제를 입력하세요', color: 'red' });
    if (insta.length + blog.length + tistory.length === 0) return notifications.show({ message: '채널을 1개 이상 선택하세요', color: 'red' });
    setSaving(true);
    try {
      const r = await createAutomation({
        name: name.trim(),
        intervalMinutes: interval,
        startNow,
        config: {
          source: { kind: 'ai', topic: topic.trim(), tone: tone as any, length: length as any, withImage: insta.length > 0, imagePrompt: imagePrompt.trim() || undefined },
          channels: { instaIds: insta, blogIds: blog, tistoryIds: tistory },
        },
      });
      if (r.ok) {
        notifications.show({ title: '자동화 생성', message: '주기마다 자동 발행됩니다 🤖', color: 'teal' });
        setName(''); setTopic(''); setImagePrompt(''); setInsta([]); setBlog([]); setTistory([]); setStartNow(false);
        setShowForm(false);
        await refresh();
      } else {
        notifications.show({ title: '실패', message: r.error || '다시 시도하세요', color: 'red' });
      }
    } finally {
      setSaving(false);
    }
  }

  function togglePause(it: AutomationListItem) {
    startTransition(async () => {
      const r = await setAutomationPaused(it.id, it.status === 'ACTIVE');
      if (r.ok) await refresh();
      else notifications.show({ message: r.error || '실패', color: 'red' });
    });
  }

  function runNow(it: AutomationListItem) {
    startTransition(async () => {
      const r = await runAutomationNow(it.id);
      notifications.show({
        title: r.ok ? '실행됨' : '실행 실패',
        message: r.note || r.error || r.status || '',
        color: r.status === 'SUCCESS' ? 'teal' : r.status === 'FAILED' ? 'red' : 'yellow',
      });
      await refresh();
    });
  }

  function remove(it: AutomationListItem) {
    if (!confirm(`"${it.name}" 자동화를 삭제할까요?`)) return;
    startTransition(async () => {
      const r = await deleteAutomation(it.id);
      if (r.ok) await refresh();
      else notifications.show({ message: r.error || '실패', color: 'red' });
    });
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={600}>내 자동화 ({items.length})</Text>
        <Button size="xs" variant={showForm ? 'subtle' : 'light'} leftSection={<IconPlus size={16} />} onClick={() => setShowForm((v) => !v)}>
          {showForm ? '접기' : '새 자동화'}
        </Button>
      </Group>

      {showForm && (
        <Paper withBorder radius="md" p="md">
          {!hasAnyAccount && (
            <Alert color="yellow" variant="light" icon={<IconAlertCircle size={18} />} mb="sm">
              먼저 인스타/블로그/티스토리 계정을 연결하세요. 연결된 계정이 있어야 발행할 수 있어요.
            </Alert>
          )}
          <Stack gap="sm">
            <TextInput label="이름" placeholder="예: 3시간마다 강아지 인스타" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
            <Box>
              <Text size="sm" fw={500} mb={4}>실행 주기</Text>
              <Group gap="xs">
                {INTERVAL_PRESETS.map((p) => (
                  <Button key={p.value} size="xs" variant={interval === p.value ? 'filled' : 'default'} radius="xl" onClick={() => setInterval(p.value)}>
                    {p.label}
                  </Button>
                ))}
                <NumberInput size="xs" w={120} min={5} suffix="분" value={interval} onChange={(v) => setInterval(Number(v) || 60)} />
              </Group>
            </Box>
            <Textarea label="AI가 쓸 주제" placeholder="예: 강아지와 함께하는 일상 팁" autosize minRows={2} value={topic} onChange={(e) => setTopic(e.currentTarget.value)} required />
            <Group grow>
              <Select label="톤" data={[{ value: 'info', label: '정보' }, { value: 'guide', label: '가이드' }, { value: 'review', label: '리뷰' }, { value: 'friendly', label: '친근' }]} value={tone} onChange={(v) => setTone(v || 'info')} />
              <Select label="길이" data={[{ value: 'short', label: '짧게' }, { value: 'medium', label: '보통' }, { value: 'long', label: '길게' }]} value={length} onChange={(v) => setLength(v || 'medium')} />
            </Group>
            <TextInput label="이미지 설명 (선택)" placeholder="비우면 주제로 자동 생성" value={imagePrompt} onChange={(e) => setImagePrompt(e.currentTarget.value)} />
            <Divider label="발행 채널" labelPosition="left" />
            {accounts.instagram.length > 0 && (
              <MultiSelect label="인스타그램" data={accounts.instagram.map((a) => ({ value: a.id, label: a.label }))} value={insta} onChange={setInsta} placeholder="계정 선택" />
            )}
            {accounts.blog.length > 0 && (
              <MultiSelect label="네이버블로그" data={accounts.blog.map((a) => ({ value: a.id, label: a.label }))} value={blog} onChange={setBlog} placeholder="계정 선택" />
            )}
            {accounts.tistory.length > 0 && (
              <MultiSelect label="티스토리" data={accounts.tistory.map((a) => ({ value: a.id, label: a.label }))} value={tistory} onChange={setTistory} placeholder="계정 선택" />
            )}
            <Switch label="첫 실행을 지금 바로" checked={startNow} onChange={(e) => setStartNow(e.currentTarget.checked)} />
            <Button leftSection={<IconBolt size={16} />} loading={saving} onClick={submit} disabled={!hasAnyAccount}>
              자동화 만들기
            </Button>
          </Stack>
        </Paper>
      )}

      {items.length === 0 ? (
        <Paper withBorder radius="md" p="xl">
          <Text c="dimmed" ta="center" size="sm">아직 자동화가 없어요. "새 자동화"로 만들거나, 허브 AI 비서에게 "3시간마다 ~ 올려줘"라고 말해보세요.</Text>
        </Paper>
      ) : (
        items.map((it) => (
          <Paper key={it.id} withBorder radius="md" p="md">
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Box style={{ minWidth: 0 }}>
                <Group gap="xs" mb={4}>
                  <Text fw={600} truncate>{it.name}</Text>
                  <Badge size="sm" variant="light" color={it.status === 'ACTIVE' ? 'teal' : 'gray'}>
                    {it.status === 'ACTIVE' ? '동작중' : '일시정지'}
                  </Badge>
                  {it.lastStatus && (
                    <Badge size="sm" variant="dot" color={statusColor(it.lastStatus)}>최근 {it.lastStatus}</Badge>
                  )}
                </Group>
                <Group gap="lg">
                  <Text size="xs" c="dimmed"><IconClock size={12} style={{ verticalAlign: -1 }} /> {it.intervalMinutes}분마다</Text>
                  <Text size="xs" c="dimmed">다음: {fmt(it.nextRunAt)}</Text>
                  <Text size="xs" c="dimmed">실행 {it.runCount}회</Text>
                </Group>
                {it.lastError && <Text size="xs" c="red" mt={4} lineClamp={2}>오류: {it.lastError}</Text>}
              </Box>
              <Group gap={6} wrap="nowrap">
                <ActionIcon variant="light" color="blue" onClick={() => runNow(it)} loading={pending} title="지금 실행">
                  <IconPlayerPlay size={16} />
                </ActionIcon>
                <ActionIcon variant="light" color="gray" onClick={() => togglePause(it)} loading={pending} title={it.status === 'ACTIVE' ? '일시정지' : '재개'}>
                  <IconPlayerPause size={16} />
                </ActionIcon>
                <ActionIcon variant="light" color="red" onClick={() => remove(it)} loading={pending} title="삭제">
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))
      )}
    </Stack>
  );
}
