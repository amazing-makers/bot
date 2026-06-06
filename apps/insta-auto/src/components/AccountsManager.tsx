'use client';

import { useState, useTransition, useEffect } from 'react';
import {
    Card, Stack, Group, Text, Badge, Button, TextInput, Paper, ThemeIcon, Box, Alert, Anchor, List,
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

    // OAuth 콜백 결과(?connected=N / ?error=...) 표시 후 URL 정리.
    useEffect(() => {
        const q = new URLSearchParams(window.location.search);
        const connected = q.get('connected');
        const error = q.get('error');
        if (connected) notifications.show({ title: '연결 완료', message: `인스타 비즈니스 계정 ${connected}개가 연결되었습니다.`, color: 'teal' });
        else if (error) notifications.show({ title: '연결 실패', message: error, color: 'red', autoClose: 8000 });
        if (connected || error) window.history.replaceState({}, '', window.location.pathname);
    }, []);

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
            {/* 간편 연결 — Instagram 로그인(OAuth). 페이스북 불필요, 고객은 인스타 로그인만. */}
            <Paper withBorder p="md" radius="md" bg="grape.0">
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                        <ThemeIcon variant="gradient" gradient={{ from: 'grape', to: 'pink' }} size={40} radius="md"><IconBrandInstagram size={22} /></ThemeIcon>
                        <Box>
                            <Text fw={700} size="sm">인스타그램으로 연결 (추천)</Text>
                            <Text size="xs" c="dimmed">인스타 계정으로 로그인만 하면 자동 연결됩니다. 페이스북 불필요. (비즈니스/크리에이터 계정 필요)</Text>
                        </Box>
                    </Group>
                    <Button component="a" href="/api/connect/instagram" target="_blank" rel="noopener noreferrer" variant="gradient" gradient={{ from: 'grape', to: 'pink' }} leftSection={<IconBrandInstagram size={18} />}>
                        인스타그램으로 연결
                    </Button>
                </Group>
            </Paper>

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
                            <Paper withBorder p="md" radius="md" bg="grape.0">
                                <Group gap={6} mb="xs">
                                    <IconInfoCircle size={16} color="var(--mantine-color-grape-6)" />
                                    <Text size="sm" fw={700}>처음이세요? 토큰 연결 4단계</Text>
                                </Group>
                                <List type="ordered" size="xs" spacing={6}>
                                    <List.Item>
                                        <b>비즈니스/크리에이터 계정 확인</b> — 인스타 앱 → 설정 → 계정 → ‘프로페셔널 계정으로 전환’ + Facebook 페이지 연결 (개인 계정은 발행 불가)
                                    </List.Item>
                                    <List.Item>
                                        <b>토큰 발급</b> —{' '}
                                        <Anchor href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" size="xs">Graph API Explorer ↗</Anchor>
                                        {' '}에서 앱 선택 → 권한 추가(<Text span size="xs" c="dimmed">instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement</Text>) → ‘Generate Access Token’
                                    </List.Item>
                                    <List.Item>
                                        <b>Instagram User ID 확인</b> — 보통 <Text span size="xs" c="dimmed">17…</Text> 로 시작하는 긴 숫자({' '}
                                        <Anchor href="https://developers.facebook.com/docs/instagram-api/getting-started" target="_blank" rel="noreferrer" size="xs">찾는 법 ↗</Anchor>)
                                    </List.Item>
                                    <List.Item>
                                        <b>아래에 붙여넣고 ‘연결하고 검증’</b> — 토큰이 유효하면 계정 정보(이름·팔로워)를 자동으로 불러옵니다
                                    </List.Item>
                                </List>
                            </Paper>
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
