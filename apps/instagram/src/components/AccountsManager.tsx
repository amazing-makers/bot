'use client';

import { useState, useTransition } from 'react';
import {
    Card, Stack, Group, Text, Badge, Button, TextInput, Paper, ThemeIcon, Box, Alert, Anchor,
} from '@mantine/core';
import { IconBrandInstagram, IconTrash, IconPlus, IconInfoCircle, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { connectAccountAction, deleteAccountAction } from '@/app/actions/accounts';

interface AccountItem {
    id: string;
    igUserId: string;
    username: string;
    followers: number | null;
    status: string;
    tokenExpiresAt: Date | null;
    createdAt: Date;
    _count: { posts: number };
}

export function AccountsManager({ initialAccounts }: { initialAccounts: AccountItem[] }) {
    const [showForm, setShowForm] = useState(initialAccounts.length === 0);
    const [accessToken, setAccessToken] = useState('');
    const [igUserId, setIgUserId] = useState('');
    const [err, setErr] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        const fd = new FormData();
        fd.set('accessToken', accessToken);
        fd.set('igUserId', igUserId);
        startTransition(async () => {
            const r = await connectAccountAction(fd);
            if (!r.ok) {
                setErr(r.error || '연결 실패');
                return;
            }
            notifications.show({ title: '연결 완료', message: `@${r.username} 계정이 연결되었습니다.`, color: 'teal' });
            setAccessToken('');
            setIgUserId('');
            setShowForm(false);
        });
    };

    const handleDelete = (id: string, username: string) => {
        startTransition(async () => {
            const r = await deleteAccountAction(id);
            if (r.ok) {
                notifications.show({ title: '연결 해제', message: `@${username} 계정 연결을 해제했습니다.`, color: 'gray' });
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
                                    <ThemeIcon variant="light" color={a.status === 'ACTIVE' ? 'grape' : 'red'} radius="xl">
                                        <IconBrandInstagram size={18} />
                                    </ThemeIcon>
                                    <Box>
                                        <Text fw={700} size="sm">@{a.username}</Text>
                                        <Text size="11px" c="dimmed">
                                            {a.followers != null ? `${a.followers.toLocaleString()} 팔로워 · ` : ''}{a._count.posts} 게시물 · ID {a.igUserId}
                                        </Text>
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
                                        onClick={() => handleDelete(a.id, a.username)}
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
                <Button variant="light" color="grape" leftSection={<IconPlus size={16} />} onClick={() => setShowForm(true)}>
                    계정 추가 연결
                </Button>
            )}

            {showForm && (
                <Card withBorder p="lg" radius="md">
                    <form onSubmit={handleConnect}>
                        <Stack>
                            <Alert variant="light" color="grape" icon={<IconInfoCircle size={16} />}>
                                <Text size="xs">
                                    <strong>토큰 발급:</strong> developers.facebook.com → 앱(Business) → Instagram Graph API + Facebook Login →
                                    Access Token Tool 에서 Page Access Token 발급 (scope: instagram_basic, instagram_content_publish,
                                    pages_show_list, pages_read_engagement) → <Anchor href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" size="xs">Graph API Explorer ↗</Anchor>
                                </Text>
                            </Alert>
                            <TextInput
                                label="Page Access Token"
                                placeholder="EAAG..."
                                required
                                value={accessToken}
                                onChange={(e) => setAccessToken(e.currentTarget.value)}
                            />
                            <TextInput
                                label="Instagram User ID (Business Account ID)"
                                placeholder="178414..."
                                required
                                value={igUserId}
                                onChange={(e) => setIgUserId(e.currentTarget.value)}
                            />
                            {err && (
                                <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>{err}</Alert>
                            )}
                            <Group justify="flex-end">
                                {initialAccounts.length > 0 && (
                                    <Button variant="subtle" color="gray" onClick={() => setShowForm(false)}>취소</Button>
                                )}
                                <Button type="submit" color="grape" loading={pending}>연결하고 검증</Button>
                            </Group>
                        </Stack>
                    </form>
                </Card>
            )}
        </Stack>
    );
}
