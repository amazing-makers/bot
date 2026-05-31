'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Group } from '@mantine/core';
import { IconSend, IconRefresh, IconPencil } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { publishPostAction } from '@/app/actions/posts';

const LABEL: Record<string, { text: string; icon: 'send' | 'retry'; color: string }> = {
    DRAFT: { text: '발행', icon: 'send', color: 'blue' },
    SCHEDULED: { text: '지금 발행', icon: 'send', color: 'blue' },
    FAILED: { text: '재발행', icon: 'retry', color: 'orange' },
};

export function PostActions({ postId, status }: { postId: string; status: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const cfg = LABEL[status];
    const editable = status === 'DRAFT' || status === 'SCHEDULED';
    if (!cfg && !editable) return null;

    const run = () => {
        startTransition(async () => {
            const r = await publishPostAction(postId);
            if (r.ok) {
                notifications.show({ title: '발행 완료', message: '블로그에 게시되었습니다.', color: 'teal' });
            } else {
                notifications.show({ title: '발행 실패', message: r.error || '오류', color: 'red' });
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
                    leftSection={cfg.icon === 'send' ? <IconSend size={12} /> : <IconRefresh size={12} />}
                    onClick={run}
                >
                    {cfg.text}
                </Button>
            )}
        </Group>
    );
}
