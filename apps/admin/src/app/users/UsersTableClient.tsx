'use client';

import {
    Table, Badge, Text, Anchor, Checkbox, Paper, Group, Button, Modal, Stack, NumberInput, Textarea,
} from '@mantine/core';
import { IconClock, IconX } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { bulkExtendTrial } from '@/lib/actions';

interface UserRow {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date | string;
    subscription: { plan: string; status: string } | null;
    _count: { campaigns: number; channels: number; series: number };
    referredByCode: { code: string; reseller: { name: string } } | null;
}

export default function UsersTableClient({ users }: { users: UserRow[] }) {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [extendOpen, extendCtl] = useDisclosure(false);
    const [days, setDays] = useState<number | string>(14);
    const [reason, setReason] = useState('');
    const [isPending, startTransition] = useTransition();

    const allChecked = users.length > 0 && users.every(u => selected.has(u.id));
    const someChecked = !allChecked && users.some(u => selected.has(u.id));

    const toggleAll = () => {
        setSelected(s => {
            const n = new Set(s);
            if (allChecked) {
                users.forEach(u => n.delete(u.id));
            } else {
                users.forEach(u => n.add(u.id));
            }
            return n;
        });
    };

    const toggleOne = (id: string) => {
        setSelected(s => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    };

    const handleBulkExtend = () => {
        const n = typeof days === 'number' ? days : parseInt(String(days), 10);
        if (!Number.isFinite(n) || n < 1 || n > 365) {
            notifications.show({ title: '오류', message: '연장 일수는 1~365일', color: 'red' });
            return;
        }
        startTransition(async () => {
            try {
                const r = await bulkExtendTrial({
                    userIds: Array.from(selected),
                    days: n,
                    reason: reason.trim() || undefined,
                });
                notifications.show({
                    title: '✅ 일괄 연장 완료',
                    message: `${r.success}명 성공 / ${r.failed}명 실패`,
                    color: r.failed > 0 ? 'orange' : 'teal',
                    autoClose: 5000,
                });
                setSelected(new Set());
                setReason('');
                extendCtl.close();
                router.refresh();
            } catch (e: any) {
                notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
            }
        });
    };

    return (
        <>
            {/* 일괄 액션 바 */}
            {selected.size > 0 && (
                <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-violet-0)" style={{ borderColor: 'var(--mantine-color-violet-3)' }}>
                    <Group justify="space-between" wrap="wrap">
                        <Group gap={6}>
                            <Text size="sm" fw={700}>
                                {selected.size}명 선택됨
                            </Text>
                            <Button
                                size="compact-xs"
                                variant="subtle"
                                color="gray"
                                onClick={() => setSelected(new Set())}
                                leftSection={<IconX size={11} />}
                            >
                                선택 해제
                            </Button>
                        </Group>
                        <Group gap="xs">
                            <Button
                                size="xs"
                                color="green"
                                variant="light"
                                leftSection={<IconClock size={14} />}
                                onClick={extendCtl.open}
                            >
                                트라이얼 일괄 연장
                            </Button>
                        </Group>
                    </Group>
                </Paper>
            )}

            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <Table.ScrollContainer minWidth={960}>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ width: 40 }}>
                                    <Checkbox
                                        checked={allChecked}
                                        indeterminate={someChecked}
                                        onChange={toggleAll}
                                        aria-label="모두 선택"
                                    />
                                </Table.Th>
                                <Table.Th>이메일</Table.Th>
                                <Table.Th>이름</Table.Th>
                                <Table.Th>플랜</Table.Th>
                                <Table.Th>가입일</Table.Th>
                                <Table.Th>채널</Table.Th>
                                <Table.Th>캠페인</Table.Th>
                                <Table.Th>시리즈</Table.Th>
                                <Table.Th>리퍼럴</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {users.map(u => {
                                const plan = u.subscription?.plan ?? 'FREE';
                                const planColor = plan === 'BUSINESS' ? 'violet' : plan === 'PRO' ? 'blue' : plan === 'STARTER' ? 'teal' : 'gray';
                                const isSelected = selected.has(u.id);
                                return (
                                    <Table.Tr key={u.id} bg={isSelected ? 'var(--mantine-color-violet-0)' : undefined}>
                                        <Table.Td>
                                            <Checkbox
                                                checked={isSelected}
                                                onChange={() => toggleOne(u.id)}
                                                aria-label={`${u.email} 선택`}
                                            />
                                        </Table.Td>
                                        <Table.Td>
                                            <Anchor component={Link} href={`/users/${u.id}`} size="sm">{u.email}</Anchor>
                                        </Table.Td>
                                        <Table.Td><Text size="sm">{u.name || '-'}</Text></Table.Td>
                                        <Table.Td>
                                            <Badge color={planColor} variant="light" size="sm">{plan}</Badge>
                                        </Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{dayjs(u.createdAt).format('YYYY-MM-DD')}</Text></Table.Td>
                                        <Table.Td><Text size="sm">{u._count.channels}</Text></Table.Td>
                                        <Table.Td><Text size="sm">{u._count.campaigns}</Text></Table.Td>
                                        <Table.Td><Text size="sm">{u._count.series}</Text></Table.Td>
                                        <Table.Td>
                                            {u.referredByCode?.reseller ? (
                                                <Badge color="cyan" variant="light" size="xs">
                                                    {u.referredByCode.reseller.name} ({u.referredByCode.code})
                                                </Badge>
                                            ) : (
                                                <Text size="xs" c="dimmed">-</Text>
                                            )}
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </Table.ScrollContainer>
            </Paper>

            {/* 일괄 연장 모달 */}
            <Modal opened={extendOpen} onClose={extendCtl.close} title="🎁 트라이얼 일괄 연장" size="md">
                <Stack gap="md">
                    <Text size="sm">
                        선택한 <strong>{selected.size}명</strong>의 트라이얼을 N일 연장합니다.
                        기존 라이센스가 있으면 만료일을 늘리고, 없으면 새 FREE_TRIAL 라이센스를 생성합니다.
                    </Text>
                    <NumberInput
                        label="연장 일수"
                        value={days}
                        onChange={setDays}
                        min={1}
                        max={365}
                    />
                    <Textarea
                        label="사유 (선택, 감사 로그에 기록됨)"
                        value={reason}
                        onChange={(e) => setReason(e.currentTarget.value)}
                        placeholder="예: 베타 테스터 보상, 프로모션 등"
                        autosize
                        minRows={2}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={extendCtl.close} disabled={isPending}>취소</Button>
                        <Button color="green" onClick={handleBulkExtend} loading={isPending}>
                            {selected.size}명 연장하기
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
