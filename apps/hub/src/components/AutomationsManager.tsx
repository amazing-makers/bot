'use client';

import { useState, useTransition } from 'react';
import {
  Paper, Stack, Group, Text, Button, TextInput, Textarea, Select, MultiSelect, NumberInput,
  Badge, ActionIcon, Divider, Switch, Box, Alert, SegmentedControl, Modal, Image, ScrollArea, Loader,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus, IconPlayerPlay, IconTrash, IconPlayerPause, IconBolt, IconClock, IconAlertCircle, IconHistory, IconPhoto,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  createAutomation, setAutomationPaused, deleteAutomation, runAutomationNow, getAutomationRuns,
  type AutomationListItem, type AutomationRunItem,
} from '@/app/actions/automations';

type Accounts = {
  instagram: { id: string; label: string }[];
  blog: { id: string; label: string }[];
  tistory: { id: string; label: string }[];
};

type UploadItem = { imageUrl: string; caption: string; title: string; body: string };

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

function scheduleLabel(it: AutomationListItem): string {
  if (it.scheduleKind === 'daily') return `매일 ${it.dailyTime || '09:00'}`;
  if (it.scheduleKind === 'once') return '1회';
  return `${it.intervalMinutes}분마다`;
}

export function AutomationsManager({ accounts, initial }: { accounts: Accounts; initial: AutomationListItem[] }) {
  const [items, setItems] = useState<AutomationListItem[]>(initial);
  const [showForm, setShowForm] = useState(initial.length === 0);
  const [pending, startTransition] = useTransition();

  // ── 폼 상태 ──
  const [name, setName] = useState('');
  const [scheduleKind, setScheduleKind] = useState<'interval' | 'daily'>('interval');
  const [interval, setInterval] = useState<number>(180);
  const [dailyTime, setDailyTime] = useState('09:00');
  const [sourceKind, setSourceKind] = useState<'ai' | 'uploaded' | 'rss'>('ai');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<string>('info');
  const [length, setLength] = useState<string>('medium');
  const [imagePrompt, setImagePrompt] = useState('');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [u, setU] = useState<UploadItem>({ imageUrl: '', caption: '', title: '', body: '' });
  const [bulkUrls, setBulkUrls] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [rewriteWithAI, setRewriteWithAI] = useState(true);
  const [insta, setInsta] = useState<string[]>([]);
  const [blog, setBlog] = useState<string[]>([]);
  const [tistory, setTistory] = useState<string[]>([]);
  const [startNow, setStartNow] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── 실행 이력 모달 ──
  const [histOpen, histCtl] = useDisclosure(false);
  const [histTitle, setHistTitle] = useState('');
  const [histRuns, setHistRuns] = useState<AutomationRunItem[] | null>(null);

  const hasAnyAccount = accounts.instagram.length + accounts.blog.length + accounts.tistory.length > 0;

  async function refresh() {
    const { listAutomations } = await import('@/app/actions/automations');
    setItems(await listAutomations());
  }

  function addUpload() {
    if (!u.imageUrl.trim() && !u.body.trim()) return notifications.show({ message: '이미지 URL 또는 본문을 입력하세요', color: 'red' });
    setUploads((arr) => [...arr, { ...u }]);
    setU({ imageUrl: '', caption: '', title: '', body: '' });
  }

  function addBulk() {
    const urls = bulkUrls.split(/[\n,]/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
    if (urls.length === 0) return notifications.show({ message: '이미지 URL을 줄바꿈으로 입력하세요', color: 'red' });
    setUploads((arr) => [...arr, ...urls.map((imageUrl) => ({ imageUrl, caption: '', title: '', body: '' }))]);
    setBulkUrls('');
    notifications.show({ message: `${urls.length}개 항목 추가됨`, color: 'teal' });
  }

  async function submit() {
    if (!name.trim()) return notifications.show({ message: '이름을 입력하세요', color: 'red' });
    if (insta.length + blog.length + tistory.length === 0) return notifications.show({ message: '채널을 1개 이상 선택하세요', color: 'red' });
    if (sourceKind === 'ai' && !topic.trim()) return notifications.show({ message: 'AI가 쓸 주제를 입력하세요', color: 'red' });
    if (sourceKind === 'uploaded' && uploads.length === 0) return notifications.show({ message: '업로드 항목을 1개 이상 추가하세요', color: 'red' });
    if (sourceKind === 'rss' && !feedUrl.trim()) return notifications.show({ message: 'RSS 피드 주소를 입력하세요', color: 'red' });

    setSaving(true);
    try {
      const source =
        sourceKind === 'ai'
          ? { kind: 'ai' as const, topic: topic.trim(), tone: tone as any, length: length as any, withImage: insta.length > 0, imagePrompt: imagePrompt.trim() || undefined }
          : sourceKind === 'rss'
            ? { kind: 'rss' as const, feedUrl: feedUrl.trim(), rewriteWithAI }
            : { kind: 'uploaded' as const, items: uploads, cursor: 0 };
      const r = await createAutomation({
        name: name.trim(),
        scheduleKind,
        intervalMinutes: scheduleKind === 'interval' ? interval : undefined,
        dailyTime: scheduleKind === 'daily' ? dailyTime : undefined,
        startNow,
        config: { source, channels: { instaIds: insta, blogIds: blog, tistoryIds: tistory } },
      });
      if (r.ok) {
        notifications.show({ title: '자동화 생성', message: '정해진 일정마다 자동 발행됩니다 🤖', color: 'teal' });
        setName(''); setTopic(''); setImagePrompt(''); setUploads([]); setBulkUrls(''); setFeedUrl(''); setInsta([]); setBlog([]); setTistory([]); setStartNow(false);
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

  function openHistory(it: AutomationListItem) {
    setHistTitle(it.name);
    setHistRuns(null);
    histCtl.open();
    getAutomationRuns(it.id).then(setHistRuns).catch(() => setHistRuns([]));
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
            <TextInput label="이름" placeholder="예: 매일 아침 강아지 인스타" value={name} onChange={(e) => setName(e.currentTarget.value)} required />

            {/* 스케줄 */}
            <Box>
              <Text size="sm" fw={500} mb={4}>언제 실행할까요?</Text>
              <SegmentedControl
                fullWidth size="xs" mb="xs"
                value={scheduleKind}
                onChange={(v) => setScheduleKind(v as any)}
                data={[{ label: '주기 반복', value: 'interval' }, { label: '매일 정해진 시각', value: 'daily' }]}
              />
              {scheduleKind === 'interval' ? (
                <Group gap="xs">
                  {INTERVAL_PRESETS.map((p) => (
                    <Button key={p.value} size="xs" variant={interval === p.value ? 'filled' : 'default'} radius="xl" onClick={() => setInterval(p.value)}>
                      {p.label}
                    </Button>
                  ))}
                  <NumberInput size="xs" w={120} min={5} suffix="분" value={interval} onChange={(v) => setInterval(Number(v) || 60)} />
                </Group>
              ) : (
                <TextInput w={140} placeholder="09:00" label="매일 (KST)" value={dailyTime} onChange={(e) => setDailyTime(e.currentTarget.value)} />
              )}
            </Box>

            {/* 콘텐츠 소스 */}
            <Box>
              <Text size="sm" fw={500} mb={4}>무엇을 발행할까요?</Text>
              <SegmentedControl
                fullWidth size="xs"
                value={sourceKind}
                onChange={(v) => setSourceKind(v as any)}
                data={[{ label: 'AI 생성', value: 'ai' }, { label: '내가 올린 항목', value: 'uploaded' }, { label: 'RSS 피드', value: 'rss' }]}
              />
            </Box>

            {sourceKind === 'ai' && (
              <>
                <Textarea label="AI가 쓸 주제" placeholder="예: 강아지와 함께하는 일상 팁" autosize minRows={2} value={topic} onChange={(e) => setTopic(e.currentTarget.value)} />
                <Group grow>
                  <Select label="톤" data={[{ value: 'info', label: '정보' }, { value: 'guide', label: '가이드' }, { value: 'review', label: '리뷰' }, { value: 'friendly', label: '친근' }]} value={tone} onChange={(v) => setTone(v || 'info')} />
                  <Select label="길이" data={[{ value: 'short', label: '짧게' }, { value: 'medium', label: '보통' }, { value: 'long', label: '길게' }]} value={length} onChange={(v) => setLength(v || 'medium')} />
                </Group>
                <TextInput label="이미지 설명 (선택)" placeholder="비우면 주제로 자동 생성" value={imagePrompt} onChange={(e) => setImagePrompt(e.currentTarget.value)} />
              </>
            )}

            {sourceKind === 'uploaded' && (
              <Paper withBorder radius="sm" p="sm" bg="var(--mantine-color-gray-0)">
                <Text size="xs" c="dimmed" mb="xs">발행할 항목을 순서대로 추가하세요. 매 회차 위에서부터 하나씩 사용합니다.</Text>
                <Stack gap={6}>
                  <Textarea size="xs" label="이미지 URL 여러 개 (줄바꿈으로 한 번에)" placeholder={'https://...\nhttps://...'} autosize minRows={2} value={bulkUrls} onChange={(e) => setBulkUrls(e.currentTarget.value)} />
                  <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addBulk}>URL 일괄 추가</Button>
                  <Divider my={4} label="또는 1개씩 상세 입력" labelPosition="center" />
                  <TextInput size="xs" label="이미지 URL (인스타)" value={u.imageUrl} onChange={(e) => setU({ ...u, imageUrl: e.currentTarget.value })} />
                  <TextInput size="xs" label="캡션/제목" value={u.caption || u.title} onChange={(e) => setU({ ...u, caption: e.currentTarget.value, title: e.currentTarget.value })} />
                  <Textarea size="xs" label="본문(블로그·티스토리, 선택)" autosize minRows={1} value={u.body} onChange={(e) => setU({ ...u, body: e.currentTarget.value })} />
                  <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addUpload}>항목 추가</Button>
                </Stack>
                {uploads.length > 0 && (
                  <Stack gap={4} mt="sm">
                    <Text size="xs" fw={600} c="dimmed">추가된 항목 {uploads.length}개</Text>
                    {uploads.map((it, i) => (
                      <Group key={i} gap="xs" wrap="nowrap">
                        {it.imageUrl ? <Image src={it.imageUrl} w={36} h={36} radius="sm" fit="cover" /> : <IconPhoto size={20} />}
                        <Text size="xs" truncate flex={1}>{it.caption || it.title || it.imageUrl || it.body?.slice(0, 30) || '(빈 항목)'}</Text>
                        <ActionIcon size="sm" variant="subtle" color="red" onClick={() => setUploads((arr) => arr.filter((_, j) => j !== i))}><IconTrash size={14} /></ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Paper>
            )}

            {sourceKind === 'rss' && (
              <Paper withBorder radius="sm" p="sm" bg="var(--mantine-color-gray-0)">
                <Text size="xs" c="dimmed" mb="xs">RSS/Atom 피드의 최신 글을 매 회차 자동으로 가져와 발행합니다(같은 글 중복 방지).</Text>
                <Stack gap={6}>
                  <TextInput size="xs" label="피드 주소" placeholder="https://블로그/feed 또는 .../rss" value={feedUrl} onChange={(e) => setFeedUrl(e.currentTarget.value)} />
                  <Switch size="sm" label="AI로 SNS용 재작성(권장)" checked={rewriteWithAI} onChange={(e) => setRewriteWithAI(e.currentTarget.checked)} />
                </Stack>
              </Paper>
            )}

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
                  <Text size="xs" c="dimmed"><IconClock size={12} style={{ verticalAlign: -1 }} /> {scheduleLabel(it)}</Text>
                  <Text size="xs" c="dimmed">다음: {fmt(it.nextRunAt)}</Text>
                  <Text size="xs" c="dimmed">실행 {it.runCount}회</Text>
                </Group>
                {it.lastError && <Text size="xs" c="red" mt={4} lineClamp={2}>오류: {it.lastError}</Text>}
              </Box>
              <Group gap={6} wrap="nowrap">
                <ActionIcon variant="light" color="grape" onClick={() => openHistory(it)} title="실행 이력"><IconHistory size={16} /></ActionIcon>
                <ActionIcon variant="light" color="blue" onClick={() => runNow(it)} loading={pending} title="지금 실행"><IconPlayerPlay size={16} /></ActionIcon>
                <ActionIcon variant="light" color="gray" onClick={() => togglePause(it)} loading={pending} title={it.status === 'ACTIVE' ? '일시정지' : '재개'}><IconPlayerPause size={16} /></ActionIcon>
                <ActionIcon variant="light" color="red" onClick={() => remove(it)} loading={pending} title="삭제"><IconTrash size={16} /></ActionIcon>
              </Group>
            </Group>
          </Paper>
        ))
      )}

      <Modal opened={histOpen} onClose={histCtl.close} title={`실행 이력 — ${histTitle}`} size="md">
        {histRuns === null ? (
          <Group justify="center" py="lg"><Loader size="sm" /></Group>
        ) : histRuns.length === 0 ? (
          <Text c="dimmed" size="sm" ta="center" py="lg">아직 실행 기록이 없어요.</Text>
        ) : (
          <ScrollArea h={360}>
            <Stack gap="xs">
              {histRuns.map((r) => (
                <Paper key={r.id} withBorder radius="sm" p="xs">
                  <Group justify="space-between" gap="xs">
                    <Badge size="sm" variant="light" color={statusColor(r.status)}>{r.status}</Badge>
                    <Text size="xs" c="dimmed">{fmt(r.startedAt)}</Text>
                  </Group>
                  {r.summary && <Text size="xs" mt={4}>{r.summary}</Text>}
                  {r.error && <Text size="xs" c="red" mt={4}>{r.error}</Text>}
                </Paper>
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Modal>
    </Stack>
  );
}
