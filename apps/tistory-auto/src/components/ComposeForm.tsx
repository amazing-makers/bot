'use client';

import { useState, useRef, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { marked } from 'marked';
import {
    Card, Stack, Select, Textarea, TextInput, Button, Group, Text, Image, Box, Switch, Alert, Divider,
    SegmentedControl, Paper, Tooltip, Anchor, ThemeIcon, Typography, ScrollArea,
} from '@mantine/core';
import {
    IconSend, IconCalendarTime, IconAlertCircle, IconSparkles, IconClock, IconArticle, IconWand, IconPhoto, IconStar, IconRobot,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createPostAction, updatePostAction } from '@/app/actions/posts';
import { generateImageAction, generateBlogPostAction } from '@/app/actions/ai';
import { IMAGE_RATIOS, type ImageRatio } from '@/lib/ai/image-gen';
import type { BlogTone, BlogLength } from '@/lib/ai/writer';
import { suggestPrimeTime } from '@/lib/scheduling/prime-time';

function toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ComposeForm({
    accounts,
    initialScheduledAt,
    editPost,
    hasAiKey = false,
}: {
    accounts: { value: string; label: string }[];
    initialScheduledAt?: string;
    editPost?: { id: string; accountId: string; title: string; content: string; photoUrl: string | null; scheduledAt: string | null };
    hasAiKey?: boolean;
}) {
    const router = useRouter();
    const isEdit = !!editPost;
    const [accountId, setAccountId] = useState<string | null>(editPost?.accountId ?? accounts[0]?.value ?? null);
    const [title, setTitle] = useState(editPost?.title ?? '');
    const [content, setContent] = useState(editPost?.content ?? '');
    const [photoUrl, setPhotoUrl] = useState(editPost?.photoUrl ?? '');
    const [schedule, setSchedule] = useState(!!(editPost?.scheduledAt ?? initialScheduledAt));
    const [scheduledAt, setScheduledAt] = useState(
        editPost?.scheduledAt ? toLocalInput(new Date(editPost.scheduledAt)) : (initialScheduledAt ?? ''),
    );
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const contentRef = useRef<HTMLTextAreaElement>(null);

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
        try { return marked.parse(content || '', { async: false }) as string; } catch { return ''; }
    }, [content]);

    const insertAtCursor = (text: string) => {
        const ta = contentRef.current;
        if (!ta) { setContent((c) => `${c}\n${text}\n`); return; }
        const start = ta.selectionStart ?? content.length;
        const end = ta.selectionEnd ?? content.length;
        const next = content.slice(0, start) + text + content.slice(end);
        setContent(next);
        requestAnimationFrame(() => { ta.focus(); const pos = start + text.length; ta.selectionStart = ta.selectionEnd = pos; });
    };

    const writePost = () => {
        setErr(null); setNeedKey(false);
        if (!topic.trim()) { setErr('글 주제를 입력하세요'); return; }
        startWrite(async () => {
            const r = await generateBlogPostAction(topic, tone, length);
            if (r.ok && r.markdown) {
                if (r.title) setTitle(r.title);
                setContent(r.markdown);
                notifications.show({ title: 'AI 글 작성', message: `${r.provider} 로 초안을 생성했습니다.`, color: 'orange' });
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
            if (r.ok && r.url) {
                setLastImage(r.url);
                notifications.show({ title: 'AI 이미지 생성', message: '아래에서 대표/본문 삽입을 선택하세요.', color: 'orange' });
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
        const scheduledIso = schedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
        startTransition(async () => {
            const r = isEdit
                ? await updatePostAction({ postId: editPost!.id, title, content, photoUrl, publishNow, scheduledAt: scheduledIso })
                : await createPostAction({ accountId, title, content, photoUrl, publishNow, scheduledAt: scheduledIso });
            if (!r.ok) { setErr(r.error || '실패했습니다'); return; }
            notifications.show({
                title: publishNow ? '발행 큐 적재' : schedule ? (isEdit ? '예약 수정' : '예약 완료') : (isEdit ? '수정 저장' : '초안 저장'),
                message: publishNow ? '데스크톱 에이전트가 티스토리에 발행합니다 (큐 대기).' : '대시보드에서 확인하세요.',
                color: 'teal',
            });
            router.push('/dashboard');
        });
    };

    return (
        <Group align="flex-start" gap="lg" wrap="wrap">
            <Card withBorder p="lg" radius="md" style={{ flex: 1, minWidth: 380 }}>
                <Stack>
                    <Select label="블로그" data={accounts} value={accountId} onChange={setAccountId} allowDeselect={false} />

                    {/* AI 글쓰기 */}
                    <Paper withBorder p="sm" radius="md" bg="orange.0">
                        <Group gap="xs" mb={6}><IconWand size={16} color="var(--mantine-color-orange-6)" /><Text size="sm" fw={700}>AI 글 작성 (주제 한 줄 → 제목+본문)</Text></Group>
                        <Stack gap="xs">
                            <TextInput placeholder="주제 예: 제주 3박4일 여행 코스" value={topic} onChange={(e) => setTopic(e.currentTarget.value)} />
                            <Group gap="xs" wrap="wrap">
                                <Select size="xs" w={120} value={tone} onChange={(v) => setTone(v as BlogTone)} data={[
                                    { value: 'info', label: '정보' }, { value: 'guide', label: '가이드' },
                                    { value: 'review', label: '리뷰' }, { value: 'friendly', label: '친근' },
                                ]} allowDeselect={false} />
                                <SegmentedControl size="xs" value={length} onChange={(v) => setLength(v as BlogLength)} data={[
                                    { value: 'short', label: '짧게' }, { value: 'medium', label: '보통' }, { value: 'long', label: '길게' },
                                ]} />
                                <Button size="xs" color="orange" loading={writePending} leftSection={<IconWand size={14} />} onClick={writePost} ml="auto">AI로 글 작성</Button>
                            </Group>
                            {(needKey || !hasAiKey) && (
                                <Alert color="orange" variant="light" py={6} px="sm">
                                    <Text size="xs">무료 AI 키를 연결하면 글을 자동 생성합니다 → <Anchor href="/dashboard/settings/ai" size="xs" fw={700}>AI 키 연결</Anchor></Text>
                                </Alert>
                            )}
                        </Stack>
                    </Paper>

                    <TextInput label="제목" placeholder="글 제목 (AI가 채워줍니다)" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} />

                    {/* AI 이미지 */}
                    <Paper withBorder p="sm" radius="md" bg="orange.0">
                        <Group gap="xs" mb={6}><IconSparkles size={16} color="var(--mantine-color-orange-6)" /><Text size="sm" fw={700}>AI 이미지 생성 (무료)</Text></Group>
                        <Stack gap="xs">
                            <TextInput placeholder="예: 제주 바다, 노을, 감성 사진" value={aiPrompt} onChange={(e) => setAiPrompt(e.currentTarget.value)} />
                            <Group gap="xs" justify="space-between">
                                <SegmentedControl size="xs" data={IMAGE_RATIOS} value={aiRatio} onChange={(v) => setAiRatio(v as ImageRatio)} />
                                <Button size="xs" color="orange" loading={aiPending} leftSection={<IconSparkles size={14} />} onClick={genImage}>생성</Button>
                            </Group>
                            {lastImage && (
                                <Group gap="xs">
                                    <Image src={lastImage} h={56} w={56} radius="sm" fit="cover" alt="생성됨" />
                                    <Button size="xs" variant="light" color="orange" leftSection={<IconStar size={13} />} onClick={() => { setPhotoUrl(lastImage); notifications.show({ message: '대표 이미지로 설정', color: 'orange' }); }}>대표로</Button>
                                    <Button size="xs" variant="light" color="grape" leftSection={<IconPhoto size={13} />} onClick={() => insertAtCursor(`\n\n![이미지](${lastImage})\n\n`)}>본문에 삽입</Button>
                                </Group>
                            )}
                        </Stack>
                    </Paper>

                    <TextInput label="대표 이미지 URL (선택)" placeholder="AI 생성하거나 공개 URL 직접 입력" value={photoUrl} onChange={(e) => setPhotoUrl(e.currentTarget.value)} />

                    <Textarea
                        ref={contentRef}
                        label="본문 (마크다운)"
                        placeholder="## 소제목, 문단, - 목록, ![이미지](url) 마크다운으로 작성 — 우측 미리보기로 확인"
                        autosize minRows={10} maxRows={30}
                        value={content}
                        onChange={(e) => setContent(e.currentTarget.value)}
                        description={`${content.length}자 · 마크다운 → 발행 시 HTML 변환`}
                        styles={{ input: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 } }}
                    />

                    <Divider />
                    <Group justify="space-between">
                        <Switch label="예약 발행" checked={schedule} onChange={(e) => setSchedule(e.currentTarget.checked)} color="orange" />
                        <Tooltip label="한국 황금시간대 자동 추천">
                            <Button size="xs" variant="light" color="orange" leftSection={<IconClock size={14} />} onClick={fillPrimeTime}>최적 시간</Button>
                        </Tooltip>
                    </Group>
                    {schedule && (
                        <TextInput type="datetime-local" label="발행 시각" value={scheduledAt} onChange={(e) => setScheduledAt(e.currentTarget.value)} />
                    )}

                    {err && <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>{err}</Alert>}

                    <Group justify="flex-end">
                        {schedule ? (
                            <Button color="orange" leftSection={<IconCalendarTime size={16} />} loading={pending} onClick={() => submit(false)}>
                                {isEdit ? '예약 수정 저장' : '예약하기'}
                            </Button>
                        ) : (
                            <>
                                <Button variant="subtle" color="gray" loading={pending} onClick={() => submit(false)}>{isEdit ? '수정 저장' : '초안 저장'}</Button>
                                <Button color="orange" leftSection={<IconRobot size={16} />} loading={pending} onClick={() => submit(true)}>{isEdit ? '수정 후 발행' : '발행(큐 적재)'}</Button>
                            </>
                        )}
                    </Group>
                </Stack>
            </Card>

            {/* 실시간 미리보기 */}
            <Box style={{ width: 400 }}>
                <Text size="xs" c="dimmed" mb={6}>미리보기</Text>
                <Card withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                    {photoUrl ? (
                        <Image src={photoUrl} h={200} fit="cover" alt="대표 이미지" fallbackSrc="https://placehold.co/400x200?text=preview" />
                    ) : (
                        <Box h={200} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconArticle size={44} color="var(--mantine-color-gray-4)" />
                        </Box>
                    )}
                    <Box p="md">
                        <Text fw={700} size="xl" lineClamp={3} mb="sm">{title || '제목 미리보기'}</Text>
                        <ScrollArea.Autosize mah={420}>
                            {content.trim() ? (
                                <Typography>
                                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                                </Typography>
                            ) : (
                                <Text size="sm" c="dimmed">본문 미리보기 — 왼쪽에 마크다운을 입력하거나 AI로 작성하세요.</Text>
                            )}
                        </ScrollArea.Autosize>
                    </Box>
                </Card>
                <Group gap={6} mt="xs">
                    <ThemeIcon size="xs" variant="light" color="orange"><IconRobot size={12} /></ThemeIcon>
                    <Text size="11px" c="dimmed">발행 시 큐에 적재 → 데스크톱 에이전트가 티스토리에 게시합니다.</Text>
                </Group>
            </Box>
        </Group>
    );
}
