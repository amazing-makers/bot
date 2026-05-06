'use client';

import { Paper, Group, Text, Button, NumberInput, Textarea, Stack, Modal, Anchor, Badge } from '@mantine/core';
import { IconShield, IconClock, IconBan, IconExternalLink, IconCrown, IconUserOff } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extendUserTrial, forceCancelSubscription, toggleUserAdminRole } from '@/lib/actions';

interface Props {
    userId: string;
    userEmail: string;
    userRole: string;
    stripeCustomerId: string | null;
    hasActiveSub: boolean;
}

export default function AdminActionsPanel({ userId, userEmail, userRole, stripeCustomerId, hasActiveSub }: Props) {
    const router = useRouter();
    const [trialOpen, trialCtl] = useDisclosure(false);
    const [cancelOpen, cancelCtl] = useDisclosure(false);
    const [days, setDays] = useState<number | string>(14);
    const [trialReason, setTrialReason] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [busy, setBusy] = useState(false);

    const handleExtend = async () => {
        const n = typeof days === 'number' ? days : parseInt(String(days), 10);
        if (!Number.isFinite(n) || n < 1 || n > 365) {
            notifications.show({ title: '오류', message: '연장 일수는 1~365일 사이여야 합니다', color: 'red' });
            return;
        }
        setBusy(true);
        try {
            const r = await extendUserTrial(userId, n, trialReason);
            notifications.show({
                title: '✅ 트라이얼 연장 완료',
                message: `${userEmail} — ${n}일 연장 (만료: ${new Date(r.newValidUntil).toLocaleDateString('ko-KR')})`,
                color: 'green',
            });
            trialCtl.close();
            setTrialReason('');
            router.refresh();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
        } finally {
            setBusy(false);
        }
    };

    const handleToggleAdmin = async () => {
        const isAdminNow = userRole === 'ADMIN';
        const action = isAdminNow ? '강등' : '승격';
        if (!confirm(`${userEmail} 님을 ${isAdminNow ? '일반 USER 로 강등' : 'ADMIN 으로 승격'}합니다.\n계속하시겠습니까?`)) return;
        setBusy(true);
        try {
            const r = await toggleUserAdminRole(userId);
            notifications.show({
                title: `✅ ${action} 완료`,
                message: `${userEmail} → ${r.role}`,
                color: r.role === 'ADMIN' ? 'violet' : 'gray',
            });
            router.refresh();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
        } finally {
            setBusy(false);
        }
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) {
            notifications.show({ title: '오류', message: '취소 사유는 필수입니다', color: 'red' });
            return;
        }
        setBusy(true);
        try {
            await forceCancelSubscription(userId, cancelReason);
            notifications.show({
                title: '✅ 구독 취소 완료',
                message: `${userEmail} — 구독이 강제 취소되었습니다`,
                color: 'orange',
            });
            cancelCtl.close();
            setCancelReason('');
            router.refresh();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
        } finally {
            setBusy(false);
        }
    };

    const stripeUrl = stripeCustomerId
        ? `https://dashboard.stripe.com/customers/${stripeCustomerId}`
        : null;

    return (
        <>
            <Paper withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-violet-3)' }}>
                <Group gap={6} mb="sm">
                    <IconShield size={18} color="var(--mantine-color-violet-6)" />
                    <Text fw={700}>관리자 액션</Text>
                    {userRole === 'ADMIN' && (
                        <Badge size="xs" color="violet" variant="filled" leftSection={<IconCrown size={10} />}>ADMIN</Badge>
                    )}
                    <Text size="11px" c="dimmed">(모든 액션은 감사 로그에 기록됨)</Text>
                </Group>
                <Group gap="xs">
                    <Button
                        size="xs"
                        leftSection={userRole === 'ADMIN' ? <IconUserOff size={14} /> : <IconCrown size={14} />}
                        variant="light"
                        color={userRole === 'ADMIN' ? 'gray' : 'violet'}
                        onClick={handleToggleAdmin}
                        loading={busy}
                    >
                        {userRole === 'ADMIN' ? '👤 ADMIN 강등' : '👑 ADMIN 승격'}
                    </Button>
                    <Button
                        size="xs"
                        leftSection={<IconClock size={14} />}
                        variant="light"
                        color="green"
                        onClick={trialCtl.open}
                    >
                        🎁 트라이얼 연장
                    </Button>
                    {hasActiveSub && (
                        <Button
                            size="xs"
                            leftSection={<IconBan size={14} />}
                            variant="light"
                            color="red"
                            onClick={cancelCtl.open}
                        >
                            ⛔ 구독 강제 취소
                        </Button>
                    )}
                    {stripeUrl && (
                        <Button
                            size="xs"
                            leftSection={<IconExternalLink size={14} />}
                            variant="light"
                            color="blue"
                            component="a"
                            href={stripeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Stripe 대시보드 ↗
                        </Button>
                    )}
                </Group>
            </Paper>

            <Modal opened={trialOpen} onClose={trialCtl.close} title="🎁 트라이얼 라이센스 연장" size="md">
                <Stack gap="md">
                    <Text size="sm">
                        <strong>{userEmail}</strong> 님의 라이센스를 N일 연장합니다.
                        기존 라이센스가 있으면 만료일을 연장하고, 없으면 새 FREE_TRIAL 라이센스를 생성합니다.
                    </Text>
                    <NumberInput
                        label="연장 일수"
                        value={days}
                        onChange={setDays}
                        min={1}
                        max={365}
                        placeholder="14"
                    />
                    <Textarea
                        label="사유 (선택, 감사 로그에 기록됨)"
                        value={trialReason}
                        onChange={(e) => setTrialReason(e.currentTarget.value)}
                        placeholder="예: 조기 결제 사용자 보상, 베타 테스터, 환불 후 보상 등"
                        autosize
                        minRows={2}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={trialCtl.close} disabled={busy}>취소</Button>
                        <Button color="green" onClick={handleExtend} loading={busy}>{days}일 연장하기</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={cancelOpen} onClose={cancelCtl.close} title="⛔ 구독 강제 취소" size="md">
                <Stack gap="md">
                    <Text size="sm" c="red.7">
                        <strong>{userEmail}</strong> 님의 활성 구독을 강제로 cancelled 상태로 변경합니다.<br />
                        Stripe 측 처리는 별도로 진행해야 합니다 (Stripe 대시보드에서 환불 등).
                    </Text>
                    <Textarea
                        label="취소 사유 (필수, 감사 로그에 기록됨)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.currentTarget.value)}
                        placeholder="예: 사용자 요청, 결제 실패 후 후속 처리, 약관 위반 등"
                        autosize
                        minRows={2}
                        required
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={cancelCtl.close} disabled={busy}>취소</Button>
                        <Button color="red" onClick={handleCancel} loading={busy}>강제 취소 처리</Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
