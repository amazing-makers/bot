'use client';

import { useState, useTransition } from 'react';
import {
    Card, Stack, Group, Text, Badge, Button, TextInput, PasswordInput, Paper, ThemeIcon, Box, Alert, Anchor,
} from '@mantine/core';
import { IconWorldWww, IconTrash, IconPlus, IconInfoCircle, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { connectWordPressAction, deleteAccountAction } from '@/app/actions/accounts';

interface AccountItem {
    id: string;
    provider: string;
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
    const [appPassword, setAppPassword] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        const fd = new FormData();
        fd.set('siteUrl', siteUrl);
        fd.set('username', username);
        fd.set('appPassword', appPassword);
        startTransition(async () => {
            const r = await connectWordPressAction(fd);
            if (!r.ok) {
                setErr(r.error || '연결 실패');
                return;
            }
            notifications.show({ title: '연결 완료', message: `${siteUrl} 사이트가 연결되었습니다.`, color: 'teal' });
            setSiteUrl('');
            setUsername('');
            setAppPassword('');
            setShowForm(false);
        });
    };

    const handleDelete = (id: string, label: string) => {
        startTransition(async () => {
            const r = await deleteAccountAction(id);
            if (r.ok) {
                notifications.show({ title: '연결 해제', message: `${label} 연결을 해제했습니다.`, color: 'gray' });
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
                                    <ThemeIcon variant="light" color={a.status === 'ACTIVE' ? 'blue' : 'red'} radius="xl">
                                        <IconWorldWww size={18} />
                                    </ThemeIcon>
                                    <Box style={{ minWidth: 0 }}>
                                        <Text fw={700} size="sm" lineClamp={1}>{a.siteUrl.replace(/^https?:\/\//, '')}</Text>
                                        <Text size="11px" c="dimmed">WordPress · @{a.username} · {a._count.posts} 글</Text>
                                    </Box>
                                </Group>
                                <Group gap="xs">
                                    <Badge size="xs" variant="light" color={a.status === 'ACTIVE' ? 'teal' : 'red'}>
                                        {a.status === 'ACTIVE' ? '연결됨' : '재연결 필요'}
                                    </Badge>
                                    <Button
                                        size="xs"
                                        variant="subtle"
                                        color="red"
                                        leftSection={<IconTrash size={12} />}
                                        loading={pending}
                                        onClick={() => handleDelete(a.id, a.siteUrl)}
                                    >
                                        해제
                                    </Button>
                                </Group>
                            </Group>
                        </Paper>
                    ))}
                </Stack>
            )}

            {!showForm && (
                <Button variant="light" color="blue" leftSection={<IconPlus size={16} />} onClick={() => setShowForm(true)}>
                    블로그 추가 연결
                </Button>
            )}

            {showForm && (
                <Card withBorder p="lg" radius="md">
                    <form onSubmit={handleConnect}>
                        <Stack>
                            <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
                                <Text size="xs">
                                    <strong>Application Password 발급:</strong> WordPress 관리자 → 사용자 → 프로필 →
                                    "Application Passwords" 섹션에서 새 비밀번호 생성 (24자). 일반 로그인 비밀번호가 아닙니다.
                                    {' '}<Anchor href="https://wordpress.org/documentation/article/application-passwords/" target="_blank" rel="noreferrer" size="xs">가이드 ↗</Anchor>
                                </Text>
                            </Alert>
                            <TextInput
                                label="사이트 URL"
                                placeholder="https://myblog.com"
                                required
                                value={siteUrl}
                                onChange={(e) => setSiteUrl(e.currentTarget.value)}
                            />
                            <TextInput
                                label="Username"
                                placeholder="admin"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.currentTarget.value)}
                            />
                            <PasswordInput
                                label="Application Password"
                                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                                required
                                value={appPassword}
                                onChange={(e) => setAppPassword(e.currentTarget.value)}
                            />
                            {err && (
                                <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>{err}</Alert>
                            )}
                            <Group justify="flex-end">
                                {initialAccounts.length > 0 && (
                                    <Button variant="subtle" color="gray" onClick={() => setShowForm(false)}>취소</Button>
                                )}
                                <Button type="submit" color="blue" loading={pending}>연결하고 검증</Button>
                            </Group>
                        </Stack>
                    </form>
                </Card>
            )}
        </Stack>
    );
}
