'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Group } from '@mantine/core';
import { IconRobot, IconRefresh, IconPencil } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { publishPostAction } from '@/app/actions/posts';

const LABEL: Record<string, { text: string; icon: 'queue' | 'retry'; color: string }> = {
    DRAFT: { text: '발행(큐)', icon: 'queue', color: 'orange' },
    SCHEDULED: { text: '지금 발행(큐)', icon: 'queue', color: 'orange' },
    FAILED: { text: '재시도(큐)', icon: 'retry', color: 'orange' },
};

export function PostActions({ postId, status }: { postId: string; status: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const cfg = LABEL[status];
    const editable = status === 'DRAFT' || status === 'SCHEDULED';
    if (!cfg && !editable) return null; // QUEUED/PUBLISHING/PUBLISHED 는 액션 없음

    const run = () => {
        startTransition(async () => {
            const r = await publishPostAction(postId);
            if (r.ok) {
                notifications.show({ title: '큐 적재', message: '에이전트가 티스토리에 발행합니다.', color: 'teal' });
            } else {
                notifications.show({ title: '실패', message: r.error || '오류', color: 'red' });
            }
            router.refresh();
        });
    };

    return (
        <Group gap={4} wrap="nowrap">
            {editable && (
                <Button size="xs" variant="subtle" color="gray" component="a" href={`/dashboard/compose?edit=${postId}`} leftSection={<IconPencil size={12} />}>
                    수정
                </Button>
            )}
            {cfg && (
                <Button
                    size="xs"
                    variant="light"
                    color={cfg.color}
                    loading={pending}
                    leftSection={cfg.icon === 'queue' ? <IconRobot size={12} /> : <IconRefresh size={12} />}
                    onClick={run}
                >
                    {cfg.text}
                </Button>
            )}
        </Group>
    );
}
