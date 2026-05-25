'use client';

import { useState, useTransition } from 'react';
import { Card, Stack, Group, Text, Button, Code, PasswordInput, CopyButton, Alert, Divider, List } from '@mantine/core';
import { IconRefresh, IconCopy, IconCheck, IconRobot, IconInfoCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { rotateAgentTokenAction } from '@/app/actions/agent';

export function AgentTokenPanel({ initialToken, baseUrl }: { initialToken: string; baseUrl: string }) {
    const [token, setToken] = useState(initialToken);
    const [pending, startTransition] = useTransition();

    const rotate = () => {
        startTransition(async () => {
            const r = await rotateAgentTokenAction();
            if (r.ok) {
                setToken(r.token);
                notifications.show({ title: '토큰 재발급', message: '기존 토큰은 폐기되었습니다. 에이전트 설정을 갱신하세요.', color: 'orange' });
            }
        });
    };

    return (
        <Stack gap="lg">
            <Card withBorder p="lg" radius="md">
                <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                        <IconRobot size={18} />
                        <Text fw={700}>에이전트 토큰</Text>
                    </Group>
                    <Button size="xs" variant="light" color="orange" leftSection={<IconRefresh size={14} />} loading={pending} onClick={rotate}>
                        재발급
                    </Button>
                </Group>
                <Group align="flex-end" gap="xs">
                    <PasswordInput label="Bearer Token" value={token} readOnly style={{ flex: 1 }} />
                    <CopyButton value={token}>
                        {({ copied, copy }) => (
                            <Button variant={copied ? 'filled' : 'light'} color={copied ? 'teal' : 'gray'} onClick={copy} leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                                {copied ? '복사됨' : '복사'}
                            </Button>
                        )}
                    </CopyButton>
                </Group>
                <Text size="xs" c="dimmed" mt={6}>이 토큰을 데스크톱 에이전트 설정에 입력하세요. 노출 시 재발급하면 기존 토큰은 즉시 폐기됩니다.</Text>
            </Card>

            <Card withBorder p="lg" radius="md">
                <Text fw={700} mb="xs">에이전트 연동 (Phase 2)</Text>
                <Alert variant="light" color="orange" icon={<IconInfoCircle size={16} />} mb="sm">
                    <Text size="xs">
                        티스토리는 공개 API가 없어, 카카오 로그인 세션을 쓰는 데스크톱 에이전트(Playwright)가 글쓰기 에디터를 자동화해 발행합니다.
                        에이전트는 아래 엔드포인트를 위 토큰으로 폴링합니다.
                    </Text>
                </Alert>
                <Text size="sm" fw={600} mb={4}>API 계약</Text>
                <List size="xs" spacing={4}>
                    <List.Item><Code>POST {baseUrl}/api/agent/poll</Code> — 대기(QUEUED) 글 가져오기 → PUBLISHING 전환</List.Item>
                    <List.Item><Code>POST {baseUrl}/api/agent/complete</Code> — {`{ postId, ok, link?, error? }`} 결과 보고</List.Item>
                    <List.Item>인증: <Code>Authorization: Bearer &lt;token&gt;</Code></List.Item>
                </List>
                <Divider my="sm" />
                <Text size="xs" c="dimmed">
                    발행을 누르면 글이 큐(QUEUED)에 적재됩니다. 에이전트가 실행 중이면 폴링해서 발행하고, 없으면 큐에서 대기합니다.
                </Text>
            </Card>
        </Stack>
    );
}
