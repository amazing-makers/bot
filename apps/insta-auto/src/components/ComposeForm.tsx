'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card, Stack, Select, Textarea, TextInput, Button, Group, Text, Image, Box, Switch, Alert, Divider,
    SegmentedControl, Paper, Avatar, Tooltip, Anchor,
} from '@mantine/core';
import {
    IconSend, IconCalendarTime, IconAlertCircle, IconSparkles, IconClock, IconHash, IconBrandInstagram, IconHeart, IconMessageCircle, IconWand,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createPostAction, updatePostAction } from '@/app/actions/posts';
import { generateImageAction, generateCaptionAction } from '@/app/actions/ai';
import { IMAGE_RATIOS, type ImageRatio } from '@/lib/ai/image-gen';
import { suggestPrimeTime } from '@/lib/scheduling/prime-time';

const IG_CAPTION_LIMIT = 2200;

/** Date → datetime-local input 값 (로컬 시간 YYYY-MM-DDTHH:mm). */
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
    editPost?: { id: string; accountId: string; caption: string; imageUrl: string | null; scheduledAt: string | null };
    hasAiKey?: boolean;
}) {
    const router = useRouter();
    const isEdit = !!editPost;
    const [accountId, setAccountId] = useState<string | null>(editPost?.accountId ?? accounts[0]?.value ?? null);
    const [caption, setCaption] = useState(editPost?.caption ?? '');
    const [imageUrl, setImageUrl] = useState(editPost?.imageUrl ?? '');
    const [schedule, setSchedule] = useState(!!(editPost?.scheduledAt ?? initialScheduledAt));
    const [scheduledAt, setScheduledAt] = useState(
        editPost?.scheduledAt ? toLocalInput(new Date(editPost.scheduledAt)) : (initialScheduledAt ?? ''),
    );
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // AI 이미지
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiRatio, setAiRatio] = useState<ImageRatio>('square');
    const [aiPending, startAi] = useTransition();

    // AI 캡션
    const [capTopic, setCapTopic] = useState('');
    const [capTone, setCapTone] = useState('friendly');
    const [needKey, setNeedKey] = useState(false);
    const [capPending, startCap] = useTransition();

    const hashtagCount = (caption.match(/#[^\s#]+/g) || []).length;
    const accountLabel = accounts.find((a) => a.value === accountId)?.label ?? '@account';

    const genImage = () => {
        setErr(null);
        if (!aiPrompt.trim()) { setErr('AI 이미지 설명(프롬프트)을 입력하세요'); return; }
        startAi(async () => {
            const r = await generateImageAction(aiPrompt, aiRatio);
            if (r.ok && r.url) {
                setImageUrl(r.url);
                notifications.show({ title: 'AI 이미지 생성', message: '미리보기에 반영했습니다.', color: 'grape' });
            } else {
                setErr(r.error || 'AI 이미지 생성 실패');
            }
        });
    };

    const genCaption = () => {
        setErr(null); setNeedKey(false);
        if (!capTopic.trim()) { setErr('캡션 주제를 입력하세요'); return; }
        startCap(async () => {
            const r = await generateCaptionAction(capTopic, capTone as any);
            if (r.ok && r.caption) {
                setCaption(r.caption);
                notifications.show({ title: 'AI 캡션 생성', message: `${r.provider} 로 생성했습니다.`, color: 'grape' });
            } else {
                if ((r.error || '').includes('키가 없습니다')) setNeedKey(true);
                setErr(r.error || 'AI 캡션 생성 실패');
            }
        });
    };

    const fillPrimeTime = () => {
        const when = suggestPrimeTime('korea');
        setSchedule(true);
        setScheduledAt(toLocalInput(when));
        notifications.show({ title: '최적 시간', message: `${when.toLocaleString('ko-KR')} (한국 황금시간대)`, color: 'blue' });
    };

    const submit = (publishNow: boolean) => {
        setErr(null);
        if (!accountId) { setErr('계정을 선택하세요'); return; }
        const scheduledIso = schedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
        startTransition(async () => {
            const r = isEdit
                ? await updatePostAction({ postId: editPost!.id, caption, imageUrl, publishNow, scheduledAt: scheduledIso })
                : await createPostAction({ accountId, caption, imageUrl, publishNow, scheduledAt: scheduledIso });
            if (!r.ok) { setErr(r.error || '실패했습니다'); return; }
            notifications.show({
                title: publishNow ? '발행 완료' : schedule ? (isEdit ? '예약 수정' : '예약 완료') : (isEdit ? '수정 저장' : '초안 저장'),
                message: publishNow ? '인스타그램에 게시되었습니다.' : '대시보드에서 확인하세요.',
                color: 'teal',
            });
            router.push('/dashboard');
        });
    };

    return (
        <Group align="flex-start" gap="lg" wrap="wrap">
            {/* 작성 폼 */}
            <Card withBorder p="lg" radius="md" style={{ flex: 1, minWidth: 340 }}>
                <Stack>
                    <Select label="계정" data={accounts} value={accountId} onChange={setAccountId} allowDeselect={false} />

                    {/* AI 이미지 생성 */}
                    <Paper withBorder p="sm" radius="md" bg="grape.0">
                        <Group gap="xs" mb={6}><IconSparkles size={16} color="var(--mantine-color-grape-6)" /><Text size="sm" fw={700}>AI 이미지 생성 (무료)</Text></Group>
                        <Stack gap="xs">
                            <TextInput placeholder="예: 미니멀한 카페 인테리어, 따뜻한 조명, 감성 사진" value={aiPrompt} onChange={(e) => setAiPrompt(e.currentTarget.value)} />
                            <Group gap="xs" justify="space-between">
                                <SegmentedControl size="xs" data={IMAGE_RATIOS} value={aiRatio} onChange={(v) => setAiRatio(v as ImageRatio)} />
                                <Button size="xs" color="grape" loading={aiPending} leftSection={<IconSparkles size={14} />} onClick={genImage}>생성</Button>
                            </Group>
                        </Stack>
                    </Paper>

                    <TextInput
                        label="이미지 URL (public https)"
                        placeholder="AI 생성하거나 공개 URL 직접 입력"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.currentTarget.value)}
                    />

                    {/* AI 캡션 생성 (BYOK) */}
                    <Paper withBorder p="sm" radius="md" bg="grape.0">
                        <Group gap="xs" mb={6}><IconWand size={16} color="var(--mantine-color-grape-6)" /><Text size="sm" fw={700}>AI 캡션 생성</Text></Group>
                        <Stack gap="xs">
                            <TextInput placeholder="주제/키워드 예: 가을 신메뉴 라떼 출시" value={capTopic} onChange={(e) => setCapTopic(e.currentTarget.value)} />
                            <Group gap="xs" justify="space-between">
                                <SegmentedControl size="xs" value={capTone} onChange={setCapTone} data={[
                                    { value: 'friendly', label: '친근' }, { value: 'professional', label: '전문' },
                                    { value: 'witty', label: '위트' }, { value: 'sale', label: '판매' },
                                ]} />
                                <Button size="xs" color="grape" loading={capPending} leftSection={<IconWand size={14} />} onClick={genCaption}>캡션 생성</Button>
                            </Group>
                            {(needKey || !hasAiKey) && (
                                <Alert color="blue" variant="light" py={6} px="sm">
                                    <Text size="xs">
                                        무료 AI 키를 연결하면 캡션을 자동 생성합니다 →{' '}
                                        <Anchor href="/dashboard/settings/ai" size="xs" fw={700}>AI 키 연결</Anchor>
                                    </Text>
                                </Alert>
                            )}
                        </Stack>
                    </Paper>

                    <Textarea
                        label="캡션"
                        placeholder="게시물 내용 + #해시태그 (또는 위에서 AI 생성)"
                        autosize minRows={4} maxRows={12}
                        value={caption}
                        onChange={(e) => setCaption(e.currentTarget.value)}
                        error={caption.length > IG_CAPTION_LIMIT ? `한도 ${IG_CAPTION_LIMIT}자 초과` : undefined}
                    />
                    <Group gap="md">
                        <Text size="xs" c={caption.length > IG_CAPTION_LIMIT ? 'red' : 'dimmed'}>{caption.length} / {IG_CAPTION_LIMIT}</Text>
                        <Group gap={4}><IconHash size={12} /><Text size="xs" c={hashtagCount > 30 ? 'red' : 'dimmed'}>해시태그 {hashtagCount}/30</Text></Group>
                    </Group>

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
                            <Button color="blue" leftSection={<IconCalendarTime size={16} />} loading={pending} onClick={() => submit(false)}>
                                {isEdit ? '예약 수정 저장' : '예약하기'}
                            </Button>
                        ) : (
                            <>
                                <Button variant="subtle" color="gray" loading={pending} onClick={() => submit(false)}>
                                    {isEdit ? '수정 저장' : '초안 저장'}
                                </Button>
                                <Button color="grape" leftSection={<IconSend size={16} />} loading={pending} onClick={() => submit(true)}>
                                    {isEdit ? '수정 후 발행' : '지금 발행'}
                                </Button>
                            </>
                        )}
                    </Group>
                </Stack>
            </Card>

            {/* 실시간 IG 미리보기 */}
            <Box style={{ width: 320 }}>
                <Text size="xs" c="dimmed" mb={6}>미리보기</Text>
                <Card withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
                    <Group gap="xs" p="xs">
                        <Avatar size="sm" radius="xl" color="grape"><IconBrandInstagram size={16} /></Avatar>
                        <Text size="sm" fw={700}>{accountLabel.replace('@', '')}</Text>
                    </Group>
                    {imageUrl ? (
                        <Image src={imageUrl} h={320} fit="cover" alt="미리보기" fallbackSrc="https://placehold.co/320x320?text=preview" />
                    ) : (
                        <Box h={320} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconBrandInstagram size={48} color="var(--mantine-color-gray-4)" />
                        </Box>
                    )}
                    <Stack gap={4} p="xs">
                        <Group gap="md"><IconHeart size={20} /><IconMessageCircle size={20} /></Group>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} lineClamp={6}>
                            <Text span fw={700} size="sm">{accountLabel.replace('@', '')} </Text>
                            {caption || '캡션 미리보기...'}
                        </Text>
                    </Stack>
                </Card>
            </Box>
        </Group>
    );
}
