'use client';

import { useState, useTransition } from 'react';
import {
    Card, Stack, Group, Text, Badge, Button, TextInput, Paper, ThemeIcon, Box, Alert, Anchor,
} from '@mantine/core';
import { IconWorldWww, IconTrash, IconPlus, IconInfoCircle, IconAlertCircle, IconRobot } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { connectTistoryAction, deleteAccountAction } from '@/app/actions/accounts';

interface AccountItem {
    id: string;
    siteUrl: string;
    username: string;
    status: string;
    createdAt: Date;
    _count: { posts: number };
}

export function AccountsManager({ initialAccounts }: { initialAccounts: AccountItem[] }) {
    const [showForm, setShowForm] = useState(initialAccounts.length === 0);
    const [siteUrl, setSiteUrl] = useState('');
    const [username, setUsername] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        const fd = new FormData();
        fd.set('siteUrl', siteUrl);
        fd.set('username', username);
        startTransition(async () => {
            const r = await connectTistoryAction(fd);
            if (!r.ok) {
                setErr(r.error || '등록 실패');
                return;
            }
            notifications.show({ title: '등록 완료', message: `${siteUrl} 블로그가 등록되었습니다.`, color: 'teal' });
            setSiteUrl('');
            setUsername('');
            setShowForm(false);
        });
    };

    const handleDelete = (id: string, label: string) => {
        startTransition(async () => {
            const r = await deleteAccountAction(id);
            if (r.ok) {
                notifications.show({ title: '등록 해제', message: `${label} 등록을 해제했습니다.`, color: 'gray' });
            }
        });
    };

    return (
        <Stack gap="lg">
            {initialAccounts.length > 0 && (
                <Stack gap="xs">
                    {initialAccounts.map((a) => (
                        <Paper key={a.id} withBorder p="md" radius="md">
                            <Group justify="space-between">
                                <Group gap="xs">
                                    <ThemeIcon variant="light" color={a.status === 'ACTIVE' ? 'orange' : 'red'} radius="xl">
                                        <IconWorldWww size={18} />
                                    </ThemeIcon>
                                    <Box style={{ minWidth: 0 }}>
                                        <Text fw={700} size="sm" lineClamp={1}>{a.siteUrl}</Text>
                                        <Text size="11px" c="dimmed">{a.username} · {a._count.posts} 글</Text>
                                    </Box>
                                </Group>
                                <Group gap="xs">
                                    <Badge size="xs" variant="light" color={a.status === 'ACTIVE' ? 'teal' : 'red'}>
                                        {a.status === 'ACTIVE' ? '등록됨' : '인증 대기'}
                                    </Badge>
                                    <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={12} />} loading={pending} onClick={() => handleDelete(a.id, a.siteUrl)}>
                                        해제
                                    </Button>
                                </Group>
                            </Group>
                        </Paper>
                    ))}
                </Stack>
            )}

            {!showForm && (
                <Button variant="light" color="orange" leftSection={<IconPlus size={16} />} onClick={() => setShowForm(true)}>
                    블로그 추가 등록
                </Button>
            )}

            {showForm && (
                <Card withBorder p="lg" radius="md">
                    <form onSubmit={handleConnect}>
                        <Stack>
                            <Alert variant="light" color="orange" icon={<IconRobot size={16} />}>
                                <Text size="xs">
                                    티스토리는 공개 발행 API가 없어, 자동 발행은 <strong>데스크톱 에이전트(카카오 로그인) 연동(Phase 2)</strong> 후 가능합니다.
                                    지금은 블로그 주소를 등록해 두면 글 작성·예약까지 관리할 수 있습니다.
                                </Text>
                            </Alert>
                            <TextInput
                                label="블로그 주소"
                                placeholder="myblog.tistory.com"
                                required
                                value={siteUrl}
                                onChange={(e) => setSiteUrl(e.currentTarget.value)}
                            />
                            <TextInput
                                label="블로그 이름 (표시용, 선택)"
                                placeholder="내 티스토리"
                                value={username}
                                onChange={(e) => setUsername(e.currentTarget.value)}
                            />
                            {err && <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>{err}</Alert>}
                            <Group justify="flex-end">
                                {initialAccounts.length > 0 && (
                                    <Button variant="subtle" color="gray" onClick={() => setShowForm(false)}>취소</Button>
                                )}
                                <Button type="submit" color="orange" loading={pending}>등록</Button>
                            </Group>
                        </Stack>
                    </form>
                </Card>
            )}
        </Stack>
    );
}
