'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    Card, Stack, Select, Textarea, TextInput, Button, Group, Switch, Alert,
} from '@mantine/core';
import { IconSend, IconCalendarTime, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { createPostAction } from '@/app/actions/posts';

export function ComposeForm({ accounts }: { accounts: { value: string; label: string }[] }) {
    const router = useRouter();
    const [accountId, setAccountId] = useState<string | null>(accounts[0]?.value ?? null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [schedule, setSchedule] = useState(false);
    const [scheduledAt, setScheduledAt] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const submit = (publishNow: boolean) => {
        setErr(null);
        if (!accountId) {
            setErr('블로그를 선택하세요');
            return;
        }
        startTransition(async () => {
            const r = await createPostAction({
                accountId,
                title,
                content,
                photoUrl,
                publishNow,
                scheduledAt: schedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
            });
            if (!r.ok) {
                setErr(r.error || '실패했습니다');
                return;
            }
            notifications.show({
                title: publishNow ? '발행 완료' : schedule ? '예약 완료' : '초안 저장',
                message: publishNow ? '블로그에 게시되었습니다.' : '대시보드에서 확인하세요.',
                color: 'teal',
            });
            router.push('/dashboard');
        });
    };

    return (
        <Card withBorder p="lg" radius="md">
            <Stack>
                <Select
                    label="블로그"
                    data={accounts}
                    value={accountId}
                    onChange={setAccountId}
                    allowDeselect={false}
                />
                <TextInput
                    label="제목"
                    placeholder="글 제목"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.currentTarget.value)}
                />
                <Textarea
                    label="본문"
                    placeholder="본문 (HTML 또는 일반 텍스트 — 워드프레스가 자동 단락 처리)"
                    autosize
                    minRows={8}
                    maxRows={24}
                    value={content}
                    onChange={(e) => setContent(e.currentTarget.value)}
                />
                <TextInput
                    label="대표 이미지 URL (선택, public)"
                    placeholder="https://cdn.amakers.co.kr/..."
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.currentTarget.value)}
                />

                <Switch label="예약 발행" checked={schedule} onChange={(e) => setSchedule(e.currentTarget.checked)} />
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
                            <Button color="blue" leftSection={<IconSend size={16} />} loading={pending} onClick={() => submit(true)}>
                                지금 발행
                            </Button>
                        </>
                    )}
                </Group>
            </Stack>
        </Card>
    );
}
