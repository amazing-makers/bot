import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { Stack, Title, Text } from '@mantine/core';
import BroadcastClient from './BroadcastClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: '이메일 브로드캐스트 · Amakers Admin' };

export default async function BroadcastPage() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email, (session.user as any).role)) redirect('/login');

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Title order={2}>📣 이메일 브로드캐스트</Title>
                <Text size="sm" c="dimmed">
                    필터 조건에 맞는 사용자에게 일괄 이메일 발송. 모든 발송은 감사 로그에 기록되며,
                    한 번에 최대 5000명까지 발송 가능합니다.
                </Text>
            </Stack>
            <BroadcastClient />
        </Stack>
    );
}
