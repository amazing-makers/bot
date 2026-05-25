'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@mantine/core';
import { IconSend, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { publishPostAction } from '@/app/actions/posts';

const LABEL: Record<string, { text: string; icon: 'send' | 'retry'; color: string }> = {
    DRAFT: { text: '발행', icon: 'send', color: 'grape' },
    SCHEDULED: { text: '지금 발행', icon: 'send', color: 'grape' },
    FAILED: { text: '재발행', icon: 'retry', color: 'orange' },
};

export function PostActions({ postId, status }: { postId: string; status: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const cfg = LABEL[status];
    if (!cfg) return null; // PUBLISHED/PUBLISHING 은 액션 없음

    const run = () => {
        startTransition(async () => {
            const r = await publishPostAction(postId);
            if (r.ok) {
                notifications.show({ title: '발행 완료', message: '인스타그램에 게시되었습니다.', color: 'teal' });
            } else {
                notifications.show({ title: '발행 실패', message: r.error || '오류', color: 'red' });
            }
            router.refresh();
        });
    };

    return (
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
    );
}
