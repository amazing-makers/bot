'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card, Stack, Select, Textarea, TextInput, Button, Group, Text, Image, Box, Switch, Alert,
} from '@mantine/core';
import { IconSend, IconCalendarTime, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createPostAction } from '@/app/actions/posts';

const IG_CAPTION_LIMIT = 2200;

export function ComposeForm({ accounts }: { accounts: { value: string; label: string }[] }) {
    const router = useRouter();
    const [accountId, setAccountId] = useState<string | null>(accounts[0]?.value ?? null);
    const [caption, setCaption] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [schedule, setSchedule] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const submit = (publishNow: boolean) => {
        setErr(null);
        if (!accountId) {
            setErr('계정을 선택하세요');
            return;
        }
        startTransition(async () => {
            const r = await createPostAction({
                accountId,
                caption,
                imageUrl,
                publishNow,
                scheduledAt: schedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            });
            if (!r.ok) {
                setErr(r.error || '실패했습니다');
                return;
            }
            notifications.show({
                title: publishNow ? '발행 완료' : schedule ? '예약 완료' : '초안 저장',
                message: publishNow ? '인스타그램에 게시되었습니다.' : '대시보드에서 확인하세요.',
                color: 'teal',
            });
            router.push('/dashboard');
        });
    };

    return (
        <Card withBorder p="lg" radius="md">
            <Stack>
                <Select
                    label="계정"
                    data={accounts}
                    value={accountId}
                    onChange={setAccountId}
                    allowDeselect={false}
                />
                <Textarea
                    label="캡션"
                    placeholder="게시물 내용 + #해시태그"
                    autosize
                    minRows={4}
                    maxRows={12}
                    value={caption}
                    onChange={(e) => setCaption(e.currentTarget.value)}
                    error={caption.length > IG_CAPTION_LIMIT ? `한도 ${IG_CAPTION_LIMIT}자 초과` : undefined}
                    description={`${caption.length} / ${IG_CAPTION_LIMIT}`}
                />
                <TextInput
                    label="이미지 URL (public)"
                    placeholder="https://cdn.amakers.co.kr/... (localhost 불가)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.currentTarget.value)}
                />
                {imageUrl && (
                    <Box>
                        <Text size="xs" c="dimmed" mb={4}>미리보기</Text>
                        <Image src={imageUrl} radius="sm" h={220} fit="contain" alt="미리보기" fallbackSrc="https://placehold.co/400x220?text=이미지+로드+실패" />
                    </Box>
                )}

                <Switch
                    label="예약 발행"
                    checked={schedule}
                    onChange={(e) => setSchedule(e.currentTarget.checked)}
                />
                {schedule && (
                    <TextInput
                        type="datetime-local"
                        label="발행 시각"
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.currentTarget.value)}
                    />
                )}

                {err && <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>{err}</Alert>}

                <Group justify="flex-end">
                    {schedule ? (
                        <Button color="blue" leftSection={<IconCalendarTime size={16} />} loading={pending} onClick={() => submit(false)}>
                            예약하기
                        </Button>
                    ) : (
                        <>
                            <Button variant="subtle" color="gray" loading={pending} onClick={() => submit(false)}>
                                초안 저장
                            </Button>
                            <Button color="grape" leftSection={<IconSend size={16} />} loading={pending} onClick={() => submit(true)}>
                                지금 발행
                            </Button>
                        </>
                    )}
                </Group>
            </Stack>
        </Card>
    );
}
