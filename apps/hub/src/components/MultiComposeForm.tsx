'use client';

import { useState, useRef, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import {
  Card, Stack, MultiSelect, Textarea, TextInput, Button, Group, Text, Image, Box, Switch, Alert, Divider,
  SegmentedControl, Select, Paper, Tooltip, Anchor, ThemeIcon, Typography, ScrollArea, Badge,
} from '@mantine/core';
import {
  IconSend, IconCalendarTime, IconAlertCircle, IconSparkles, IconClock, IconWand, IconStar, IconPhoto,
  IconBrandInstagram, IconArticle, IconPencil, IconChevronDown,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { BOT_TOOLS } from '@amakers/types';
import { ImageUpload } from '@/components/ImageUpload';
import { generateBlogPostAction, generateImageAction } from '@/app/actions/ai-actions';
import { publishToChannels } from '@/app/actions/multi-publish';

// 클라이언트 안전을 위해 타입은 로컬 정의(@amakers/ai 는 서버 전용 코드 포함).
type BlogTone = 'info' | 'guide' | 'review' | 'friendly';
type BlogLength = 'short' | 'medium' | 'long';
type ImageRatio = 'square' | 'portrait' | 'story' | 'landscape';

const IMAGE_RATIOS = [
  { value: 'landscape', label: '16:9 가로(대표)' },
  { value: 'square', label: '1:1 정사각형' },
  { value: 'portrait', label: '4:5 세로' },
];

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function connectUrl(botId: string): string {
  const base = BOT_TOOLS.find((t) => t.id === botId)?.url ?? '#';
  return `${base}/dashboard/accounts`;
}

type Opt = { value: string; label: string };

export function MultiComposeForm({
  channels,
  hasAiKey,
}: {
  channels: { instagram: Opt[]; blog: Opt[]; tistory: Opt[] };
  hasAiKey: boolean;
}) {
  const router = useRouter();
  const [instaIds, setInstaIds] = useState<string[]>([]);
  const [blogIds, setBlogIds] = useState<string[]>([]);
  const [tistoryIds, setTistoryIds] = useState<string[]>([]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [instaCaption, setInstaCaption] = useState('');
  const [showCaption, setShowCaption] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<BlogTone>('info');
  const [length, setLength] = useState<BlogLength>('medium');
  const [needKey, setNeedKey] = useState(false);
  const [writePending, startWrite] = useTransition();

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiRatio, setAiRatio] = useState<ImageRatio>('landscape');
  const [lastImage, setLastImage] = useState('');
  const [aiPending, startAi] = useTransition();

  const previewHtml = useMemo(() => {
    try { return marked.parse(body || '', { async: false }) as string; } catch { return ''; }
  }, [body]);

  const insertAtCursor = (text: string) => {
    const ta = bodyRef.current;
    if (!ta) { setBody((c) => `${c}\n${text}\n`); return; }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + text + body.slice(end));
    requestAnimationFrame(() => { ta.focus(); const pos = start + text.length; ta.selectionStart = ta.selectionEnd = pos; });
  };

  const writePost = () => {
    setErr(null); setNeedKey(false);
    if (!topic.trim()) { setErr('글 주제를 입력하세요'); return; }
    startWrite(async () => {
      const r = await generateBlogPostAction(topic, tone, length);
      if (r.ok && r.markdown) {
        if (r.title) setTitle(r.title);
        setBody(r.markdown);
        notifications.show({ title: 'AI 글 작성', message: `${r.provider} 로 초안을 생성했습니다.`, color: 'blue' });
      } else {
        if ((r.error || '').includes('키가 없습니다')) setNeedKey(true);
        setErr(r.error || 'AI 글 생성 실패');
      }
    });
  };

  const genImage = () => {
    setErr(null);
    if (!aiPrompt.trim()) { setErr('이미지 설명(프롬프트)을 입력하세요'); return; }
    startAi(async () => {
      const r = await generateImageAction(aiPrompt, aiRatio);
      if (r.ok && r.url) { setLastImage(r.url); notifications.show({ title: 'AI 이미지 생성', message: '대표/본문 삽입을 선택하세요.', color: 'blue' }); }
      else setErr(r.error || 'AI 이미지 생성 실패');
    });
  };

  const fillPrimeTime = () => {
    const now = new Date();
    const h = now.getHours();
    const slots = [9, 12, 19];
    let next = slots.find((s) => s > h);
    const d = new Date(now);
    if (next == null) { d.setDate(d.getDate() + 1); next = 9; }
    d.setHours(next, 0, 0, 0);
    setSchedule(true);
    setScheduledAt(toLocalInput(d));
    notifications.show({ title: '최적 시간', message: `${d.toLocaleString('ko-KR')} (한국 황금시간대)`, color: 'blue' });
  };

  const totalTargets = instaIds.length + blogIds.length + tistoryIds.length;

  const submit = (publishNow: boolean) => {
    setErr(null);
    if (totalTargets === 0) { setErr('발행할 채널을 1개 이상 선택하세요'); return; }
    const scheduledIso = schedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
    startTransition(async () => {
      const r = await publishToChannels({
        title, body, imageUrl, instaCaption,
        instaIds, blogIds, tistoryIds,
        publishNow, scheduledAt: scheduledIso,
      });
      if (!r.ok) { setErr(r.error || '실패했습니다'); return; }
      const parts: string[] = [];
      if (r.instagram) parts.push(`인스타 ${r.instagram}`);
      if (r.blog) parts.push(`블로그 ${r.blog}`);
      if (r.tistory) parts.push(`티스토리 ${r.tistory}`);
      notifications.show({
        title: r.publishNow ? '발행 시작' : schedule ? '예약 완료' : '저장 완료',
        message: `${parts.join(' · ')} — ${r.publishNow ? '곧 게시됩니다(티스토리는 에이전트 큐).' : '대시보드에서 확인하세요.'}`,
        color: 'teal',
      });
      router.push('/');
    });
  };

  const channelBlock = (
    key: 'instagram' | 'blog' | 'tistory',
    label: string,
    icon: React.ReactNode,
    color: string,
    opts: Opt[],
    value: string[],
    onChange: (v: string[]) => void,
    botId: string,
  ) => (
    <Box>
      <Group gap={6} mb={4}>
        <ThemeIcon size="sm" variant="light" color={color}>{icon}</ThemeIcon>
        <Text size="sm" fw={600}>{label}</Text>
      </Group>
      {opts.length === 0 ? (
        <Text size="xs" c="dimmed">연결된 계정이 없습니다 — <Anchor href={connectUrl(botId)} target="_blank" size="xs">연결하기 ↗</Anchor></Text>
      ) : (
        <MultiSelect placeholder={`${label} 계정 선택`} data={opts} value={value} onChange={onChange} clearable size="sm" />
      )}
    </Box>
  );

  return (
    <Group align="flex-start" gap="lg" wrap="wrap">
      <Card withBorder p="lg" radius="md" style={{ flex: 1, minWidth: 400 }}>
        <Stack>
          {/* 채널 선택 */}
          <Paper withBorder p="md" radius="md">
            <Text size="sm" fw={700} mb="sm">발행 채널 (여러 개 선택)</Text>
            <Stack gap="sm">
              {channelBlock('instagram', '인스타그램', <IconBrandInstagram size={14} />, 'grape', channels.instagram, instaIds, setInstaIds, 'instaauto')}
              {channelBlock('blog', '네이버블로그(WordPress)', <IconArticle size={14} />, 'blue', channels.blog, blogIds, setBlogIds, 'naverblogauto')}
              {channelBlock('tistory', '티스토리', <IconArticle size={14} />, 'orange', channels.tistory, tistoryIds, setTistoryIds, 'tistoryauto')}
            </Stack>
            {totalTargets > 0 && (
              <Group gap={6} mt="sm">
                <Text size="xs" c="dimmed">선택:</Text>
                {instaIds.length > 0 && <Badge size="xs" color="grape" variant="light">인스타 {instaIds.length}</Badge>}
                {blogIds.length > 0 && <Badge size="xs" color="blue" variant="light">블로그 {blogIds.length}</Badge>}
                {tistoryIds.length > 0 && <Badge size="xs" color="orange" variant="light">티스토리 {tistoryIds.length}</Badge>}
              </Group>
            )}
          </Paper>

          {/* AI 글쓰기 */}
          <Paper withBorder p="sm" radius="md" bg="blue.0">
            <Group gap="xs" mb={6}><IconWand size={16} color="var(--mantine-color-blue-6)" /><Text size="sm" fw={700}>AI 글 작성 (주제 → 제목+본문)</Text></Group>
            <Stack gap="xs">
              <TextInput placeholder="주제 예: 가을 캠핑 준비물 추천" value={topic} onChange={(e) => setTopic(e.currentTarget.value)} />
              <Group gap="xs" wrap="wrap">
                <Select size="xs" w={120} value={tone} onChange={(v) => setTone(v as BlogTone)} data={[
                  { value: 'info', label: '정보' }, { value: 'guide', label: '가이드' }, { value: 'review', label: '리뷰' }, { value: 'friendly', label: '친근' },
                ]} allowDeselect={false} />
                <SegmentedControl size="xs" value={length} onChange={(v) => setLength(v as BlogLength)} data={[
                  { value: 'short', label: '짧게' }, { value: 'medium', label: '보통' }, { value: 'long', label: '길게' },
                ]} />
                <Button size="xs" color="blue" loading={writePending} leftSection={<IconWand size={14} />} onClick={writePost} ml="auto">AI로 글 작성</Button>
              </Group>
              {(needKey || !hasAiKey) && (
                <Alert color="blue" variant="light" py={6} px="sm">
                  <Text size="xs">무료 AI 키를 연결하면 글을 자동 생성합니다 → <Anchor href="/keys" size="xs" fw={700}>AI 키 연결</Anchor></Text>
                </Alert>
              )}
            </Stack>
          </Paper>

          <TextInput label="제목" placeholder="제목 (블로그·티스토리용, AI가 채워줍니다)" value={title} onChange={(e) => setTitle(e.currentTarget.value)} />

          {/* AI 이미지 */}
          <Paper withBorder p="sm" radius="md" bg="blue.0">
            <Group gap="xs" mb={6}><IconSparkles size={16} color="var(--mantine-color-blue-6)" /><Text size="sm" fw={700}>AI 이미지 생성 (무료)</Text></Group>
            <Stack gap="xs">
              <TextInput placeholder="예: 가을 캠핑장, 모닥불, 감성 사진" value={aiPrompt} onChange={(e) => setAiPrompt(e.currentTarget.value)} />
              <Group gap="xs" justify="space-between">
                <SegmentedControl size="xs" data={IMAGE_RATIOS} value={aiRatio} onChange={(v) => setAiRatio(v as ImageRatio)} />
                <Button size="xs" color="blue" loading={aiPending} leftSection={<IconSparkles size={14} />} onClick={genImage}>생성</Button>
              </Group>
              {lastImage && (
                <Group gap="xs">
                  <Image src={lastImage} h={56} w={56} radius="sm" fit="cover" alt="생성됨" />
                  <Button size="xs" variant="light" color="blue" leftSection={<IconStar size={13} />} onClick={() => { setImageUrl(lastImage); notifications.show({ message: '대표 이미지로 설정', color: 'blue' }); }}>대표로</Button>
                  <Button size="xs" variant="light" color="grape" leftSection={<IconPhoto size={13} />} onClick={() => insertAtCursor(`\n\n![이미지](${lastImage})\n\n`)}>본문에 삽입</Button>
                </Group>
              )}
            </Stack>
          </Paper>

          <TextInput label="대표 이미지 URL (인스타는 필수)" placeholder="업로드·AI 생성하거나 공개 URL 직접 입력" value={imageUrl} onChange={(e) => setImageUrl(e.currentTarget.value)} />
          <ImageUpload label="내 PC에서 이미지 업로드" multiple={false} onUploaded={(url) => { setImageUrl(url); notifications.show({ message: '대표 이미지로 설정됨', color: 'teal' }); }} />

          <Textarea
            ref={bodyRef}
            label="본문 (마크다운)"
            placeholder="## 소제목, 문단, - 목록, ![이미지](url) — 우측 미리보기로 확인"
            autosize minRows={10} maxRows={28}
            value={body}
            onChange={(e) => setBody(e.currentTarget.value)}
            description={`${body.length}자 · 블로그/티스토리는 HTML 변환, 인스타는 캡션 자동 변환`}
            styles={{ input: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 } }}
          />

          {/* 인스타 캡션 override */}
          {instaIds.length > 0 && (
            <Box>
              <Button variant="subtle" size="xs" color="grape" leftSection={<IconPencil size={13} />} rightSection={<IconChevronDown size={13} />} onClick={() => setShowCaption((s) => !s)}>
                인스타 캡션 직접 입력 (비우면 본문에서 자동)
              </Button>
              {showCaption && (
                <Textarea mt="xs" placeholder="인스타 전용 캡션 (비우면 제목+본문 자동 변환)" autosize minRows={3} maxRows={8} value={instaCaption} onChange={(e) => setInstaCaption(e.currentTarget.value)} />
              )}
            </Box>
          )}

          <Divider />
          <Group justify="space-between">
            <Switch label="예약 발행" checked={schedule} onChange={(e) => setSchedule(e.currentTarget.checked)} />
            <Tooltip label="한국 황금시간대 자동 추천">
              <Button size="xs" variant="light" color="blue" leftSection={<IconClock size={14} />} onClick={fillPrimeTime}>최적 시간</Button>
            </Tooltip>
          </Group>
          {schedule && (
            <TextInput type="datetime-local" label="발행 시각" value={scheduledAt} onChange={(e) => setScheduledAt(e.currentTarget.value)} />
          )}

          {err && <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>{err}</Alert>}

          <Group justify="flex-end">
            {schedule ? (
              <Button color="blue" leftSection={<IconCalendarTime size={16} />} loading={pending} onClick={() => submit(false)}>예약하기</Button>
            ) : (
              <Button color="blue" leftSection={<IconSend size={16} />} loading={pending} onClick={() => submit(true)} disabled={totalTargets === 0}>
                {totalTargets > 0 ? `${totalTargets}개 채널에 발행` : '발행'}
              </Button>
            )}
          </Group>
        </Stack>
      </Card>

      {/* 미리보기 */}
      <Box style={{ width: 380 }}>
        <Text size="xs" c="dimmed" mb={6}>미리보기 (블로그)</Text>
        <Card withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
          {imageUrl ? (
            <Image src={imageUrl} h={190} fit="cover" alt="대표 이미지" fallbackSrc="https://placehold.co/380x190?text=preview" />
          ) : (
            <Box h={190} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconArticle size={40} color="var(--mantine-color-gray-4)" />
            </Box>
          )}
          <Box p="md">
            <Text fw={700} size="lg" lineClamp={3} mb="sm">{title || '제목 미리보기'}</Text>
            <ScrollArea.Autosize mah={360}>
              {body.trim() ? (
                <Typography><div dangerouslySetInnerHTML={{ __html: previewHtml }} /></Typography>
              ) : (
                <Text size="sm" c="dimmed">본문 미리보기 — 마크다운을 입력하거나 AI로 작성하세요.</Text>
              )}
            </ScrollArea.Autosize>
          </Box>
        </Card>
      </Box>
    </Group>
  );
}
