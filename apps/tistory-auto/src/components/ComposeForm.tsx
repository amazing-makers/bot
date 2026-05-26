'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card, Stack, Select, Textarea, TextInput, Button, Group, Text, Image, Box, Switch, Alert, Divider,
    SegmentedControl, Paper, Tooltip,
} from '@mantine/core';
import {
    IconSend, IconCalendarTime, IconAlertCircle, IconSparkles, IconClock, IconArticle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createPostAction } from '@/app/actions/posts';
import { generateImageAction } from '@/app/actions/ai';
import { IMAGE_RATIOS, type ImageRatio } from '@/lib/ai/image-gen';
import { suggestPrimeTime } from '@/lib/scheduling/prime-time';

function toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ComposeForm({
    accounts,
    initialScheduledAt,
}: {
    accounts: { value: string; label: string }[];
    initialScheduledAt?: string;
}) {
    const router = useRouter();
    const [accountId, setAccountId] = useState<string | null>(accounts[0]?.value ?? null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [schedule, setSchedule] = useState(!!initialScheduledAt);
    const [scheduledAt, setScheduledAt] = useState(initialScheduledAt ?? '');
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const [aiPrompt, setAiPrompt] = useState('');
    const [aiRatio, setAiRatio] = useState<ImageRatio>('landscape');
    const [aiPending, startAi] = useTransition();

    const genImage = () => {
        setErr(null);
        if (!aiPrompt.trim()) { setErr('AI 이미지 설명(프롬프트)을 입력하세요'); return; }
        startAi(async () => {
            const r = await generateImageAction(aiPrompt, aiRatio);
            if (r.ok && r.url) {
                setPhotoUrl(r.url);
                notifications.show({ title: 'AI 이미지 생성', message: '대표 이미지에 반영했습니다.', color: 'orange' });
            } else {
                setErr(r.error || 'AI 이미지 생성 실패');
            }
        });
    };

    const fillPrimeTime = () => {
        const when = suggestPrimeTime('korea');
        setSchedule(true);
        setScheduledAt(toLocalInput(when));
        notifications.show({ title: '최적 시간', message: `${when.toLocaleString('ko-KR')} (한국 황금시간대)`, color: 'orange' });
    };

    const submit = (publishNow: boolean) => {
        setErr(null);
        if (!accountId) { setErr('블로그를 선택하세요'); return; }
        startTransition(async () => {
            const r = await createPostAction({
                accountId, title, content, photoUrl, publishNow,
                scheduledAt: schedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            });
            if (!r.ok) { setErr(r.error || '실패했습니다'); return; }
            notifications.show({
                title: publishNow ? '발행 큐 추가' : schedule ? '예약 완료' : '초안 저장',
                message: publishNow ? '데스크톱 에이전트가 발행을 처리합니다 (대시보드에서 상태 확인).' : '대시보드에서 확인하세요.',
                color: 'teal',
            });
            router.push('/dashboard');
        });
    };

    return (
        <Group align="flex-start" gap="lg" wrap="wrap">
            <Card withBorder p="lg" radius="md" style={{ flex: 1, minWidth: 360 }}>
                <Stack>
                    <Select label="티스토리 블로그" data={accounts} value={accountId} onChange={setAccountId} allowDeselect={false} />

                    <Paper withBorder p="sm" radius="md" bg="orange.0">
                        <Group gap="xs" mb={6}><IconSparkles size={16} color="var(--mantine-color-orange-6)" /><Text size="sm" fw={700}>AI 대표 이미지 생성 (무료)</Text></Group>
                        <Stack gap="xs">
                            <TextInput placeholder="예: 가을 여행, 단풍, 감성 사진" value={aiPrompt} onChange={(e) => setAiPrompt(e.currentTarget.value)} />
                            <Group gap="xs" justify="space-between">
                                <SegmentedControl size="xs" data={IMAGE_RATIOS} value={aiRatio} onChange={(v) => setAiRatio(v as ImageRatio)} />
                                <Button size="xs" color="orange" loading={aiPending} leftSection={<IconSparkles size={14} />} onClick={genImage}>생성</Button>
                            </Group>
                        </Stack>
                    </Paper>

                    <TextInput label="제목" placeholder="글 제목" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
                    <TextInput label="대표 이미지 URL (선택, public)" placeholder="AI 생성하거나 공개 URL 직접 입력" value={photoUrl} onChange={(e) => setPhotoUrl(e.currentTarget.value)} />
                    <Textarea
                        label="본문 (HTML/텍스트)"
                        placeholder="본문"
                        autosize minRows={8} maxRows={24}
                        value={content}
                        onChange={(e) => setContent(e.currentTarget.value)}
                        description={`${content.length}자`}
                    />

                    <Divider />
                    <Group justify="space-between">
                        <Switch label="예약" checked={schedule} onChange={(e) => setSchedule(e.currentTarget.checked)} />
                        <Tooltip label="한국 황금시간대 자동 추천">
                            <Button size="xs" variant="light" color="orange" leftSection={<IconClock size={14} />} onClick={fillPrimeTime}>최적 시간</Button>
                        </Tooltip>
                    </Group>
                    {schedule && (
                        <TextInput type="datetime-local" label="발행 시각" value={scheduledAt} onChange={(e) => setScheduledAt(e.currentTarget.value)} />
                    )}

                    <Alert variant="light" color="orange" icon={<IconAlertCircle size={16} />}>
                        <Text size="xs">티스토리 자동 발행은 데스크톱 에이전트(Phase 2)가 처리합니다. '발행 요청' 시 큐에 적재되고, 에이전트 실행 시 게시됩니다.</Text>
                    </Alert>
                    {err && <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>{err}</Alert>}

                    <Group justify="flex-end">
                        {schedule ? (
                            <Button color="orange" leftSection={<IconCalendarTime size={16} />} loading={pending} onClick={() => submit(false)}>예약하기</Button>
                        ) : (
                            <>
                                <Button variant="subtle" color="gray" loading={pending} onClick={() => submit(false)}>초안 저장</Button>
                                <Button color="orange" leftSection={<IconSend size={16} />} loading={pending} onClick={() => submit(true)}>발행 요청</Button>
                            </>
                        )}
                    </Group>
                </Stack>
            </Card>

            <Box style={{ width: 340 }}>
                <Text size="xs" c="dimmed" mb={6}>미리보기</Text>
                <Card withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                    {photoUrl ? (
                        <Image src={photoUrl} h={180} fit="cover" alt="대표 이미지" fallbackSrc="https://placehold.co/340x180?text=preview" />
                    ) : (
                        <Box h={180} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconArticle size={44} color="var(--mantine-color-gray-4)" />
                        </Box>
                    )}
                    <Stack gap={6} p="md">
                        <Text fw={700} size="lg" lineClamp={2}>{title || '제목 미리보기'}</Text>
                        <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }} lineClamp={6}>{content || '본문 미리보기...'}</Text>
                    </Stack>
                </Card>
            </Box>
        </Group>
    );
}
