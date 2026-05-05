'use client';

import {
    Paper, Stack, Group, Select, TextInput, Textarea, Button, Text, Badge, Box, Modal, Code, Alert,
} from '@mantine/core';
import { IconMail, IconAlertTriangle, IconUsers, IconEye } from '@tabler/icons-react';
import { useState, useTransition } from 'react';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { previewBroadcast, sendBroadcast, type BroadcastFilter } from '@/lib/actions';

export default function BroadcastClient() {
    const [filter, setFilter] = useState<BroadcastFilter>({ plan: 'ALL' });
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [fromName, setFromName] = useState('마케팅봇');
    const [preview, setPreview] = useState<{ count: number; sampleEmails: string[] } | null>(null);
    const [isPending, startTransition] = useTransition();
    const [confirmOpen, confirmCtl] = useDisclosure(false);

    const handlePreview = () => {
        startTransition(async () => {
            try {
                const r = await previewBroadcast(filter);
                setPreview(r);
            } catch (e: any) {
                notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
            }
        });
    };

    const handleSend = () => {
        if (!subject.trim() || !body.trim()) {
            notifications.show({ title: '오류', message: '제목과 본문을 입력하세요', color: 'red' });
            return;
        }
        confirmCtl.open();
    };

    const confirmSend = () => {
        confirmCtl.close();
        startTransition(async () => {
            try {
                const r = await sendBroadcast({ filter, subject, bodyMarkdown: body, fromName });
                notifications.show({
                    title: '✅ 발송 완료',
                    message: `${r.sent}명 성공 · ${r.failed}명 실패`,
                    color: r.failed > 0 ? 'orange' : 'green',
                });
                if (r.sampleErrors.length > 0) {
                    console.warn('[broadcast] sample errors:', r.sampleErrors);
                }
                setSubject('');
                setBody('');
                setPreview(null);
            } catch (e: any) {
                notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
            }
        });
    };

    return (
        <>
            <Paper withBorder p="md" radius="md">
                <Stack gap="md">
                    <Text fw={700} size="sm">1️⃣ 대상 필터</Text>
                    <Group grow>
                        <Select
                            label="플랜"
                            value={filter.plan || 'ALL'}
                            onChange={(v) => setFilter({ ...filter, plan: (v as any) || 'ALL' })}
                            data={[
                                { value: 'ALL', label: '전체 플랜' },
                                { value: 'PAID', label: '유료 (STARTER+)' },
                                { value: 'FREE', label: 'FREE 만' },
                                { value: 'STARTER', label: 'STARTER 만' },
                                { value: 'PRO', label: 'PRO 만' },
                                { value: 'BUSINESS', label: 'BUSINESS 만' },
                            ]}
                        />
                        <Select
                            label="빠른 필터"
                            value={filter.quick || 'all'}
                            onChange={(v) => setFilter({ ...filter, quick: (v as any) || undefined })}
                            data={[
                                { value: 'all', label: '없음' },
                                { value: 'paid', label: '유료 사용자' },
                                { value: 'free', label: '무료 사용자' },
                                { value: 'reseller', label: '리셀러만' },
                                { value: 'referred', label: '추천 가입만' },
                            ]}
                        />
                        <TextInput
                            label="가입일 이후 (선택)"
                            type="date"
                            value={filter.signedUpAfter || ''}
                            onChange={(e) => setFilter({ ...filter, signedUpAfter: e.currentTarget.value || undefined })}
                        />
                    </Group>
                    <Group>
                        <Button variant="light" leftSection={<IconEye size={14} />} onClick={handlePreview} loading={isPending}>
                            대상 미리보기
                        </Button>
                        {preview && (
                            <Group gap={6}>
                                <IconUsers size={16} color="var(--mantine-color-violet-6)" />
                                <Text size="sm" fw={600}>
                                    {preview.count.toLocaleString()}명 매칭
                                </Text>
                                {preview.sampleEmails.length > 0 && (
                                    <Text size="xs" c="dimmed">
                                        예시: {preview.sampleEmails.slice(0, 3).join(', ')}
                                        {preview.count > 3 && ' …'}
                                    </Text>
                                )}
                            </Group>
                        )}
                    </Group>
                </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md">
                <Stack gap="md">
                    <Text fw={700} size="sm">2️⃣ 메시지</Text>
                    <TextInput
                        label="발신자 이름 (선택)"
                        placeholder="마케팅봇"
                        value={fromName}
                        onChange={(e) => setFromName(e.currentTarget.value)}
                    />
                    <TextInput
                        label="제목"
                        placeholder="[마케팅봇] 새로운 기능 안내"
                        value={subject}
                        onChange={(e) => setSubject(e.currentTarget.value)}
                        required
                    />
                    <Textarea
                        label="본문 (간단 마크다운: **굵게**, *기울임*, [링크](url), 빈 줄로 단락 구분)"
                        placeholder={`안녕하세요, **마케팅봇**의 새로운 기능을 소개해드릴게요!\n\n이번 주에 추가된 기능:\n- 시리즈 태그 필터\n- 모바일 카드 뷰\n\n[지금 사용해보기](https://marketingbot.amakers.co.kr/dashboard)`}
                        value={body}
                        onChange={(e) => setBody(e.currentTarget.value)}
                        autosize
                        minRows={8}
                        required
                    />
                </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-orange-0)" style={{ borderColor: 'var(--mantine-color-orange-3)' }}>
                <Group gap={6} mb="xs">
                    <IconAlertTriangle size={16} color="var(--mantine-color-orange-6)" />
                    <Text fw={700} size="sm">발송 전 확인</Text>
                </Group>
                <Stack gap={4}>
                    <Text size="xs">• 모든 발송은 <strong>감사 로그</strong>에 기록됩니다.</Text>
                    <Text size="xs">• 한 번에 <strong>최대 5,000명</strong>까지 발송 가능. 50건마다 200ms 대기 (rate limit).</Text>
                    <Text size="xs">• 사용자 알림 환경설정과 무관하게 발송됩니다 — <strong>중요/공지 메일에만</strong> 사용하세요.</Text>
                    <Text size="xs">• 일반 마케팅 메일은 외부 ESP (예: Mailchimp) 사용 권장.</Text>
                </Stack>
                <Group mt="md">
                    <Button
                        leftSection={<IconMail size={16} />}
                        color="violet"
                        onClick={handleSend}
                        disabled={!preview || preview.count === 0 || !subject.trim() || !body.trim()}
                    >
                        {preview ? `${preview.count}명에게 발송` : '먼저 미리보기'}
                    </Button>
                </Group>
            </Paper>

            <Modal opened={confirmOpen} onClose={confirmCtl.close} title="🚨 발송 확인" size="md">
                <Stack gap="md">
                    <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                        <Text size="sm" fw={700} mb={4}>
                            {preview?.count.toLocaleString()}명에게 즉시 발송됩니다
                        </Text>
                        <Text size="xs">취소할 수 없는 작업입니다. 정말 발송하시겠습니까?</Text>
                    </Alert>
                    <Box>
                        <Text size="xs" c="dimmed">제목</Text>
                        <Code style={{ display: 'block', padding: 8 }}>{subject}</Code>
                    </Box>
                    <Box>
                        <Text size="xs" c="dimmed">본문 미리보기 (200자)</Text>
                        <Code style={{ display: 'block', padding: 8, whiteSpace: 'pre-wrap', fontSize: 11 }}>
                            {body.slice(0, 200)}{body.length > 200 ? '...' : ''}
                        </Code>
                    </Box>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={confirmCtl.close} disabled={isPending}>취소</Button>
                        <Button color="red" onClick={confirmSend} loading={isPending}>발송 진행</Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
