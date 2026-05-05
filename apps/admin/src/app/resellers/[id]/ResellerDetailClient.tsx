'use client';

import {
    Title, Text, Stack, Group, Paper, Badge, Anchor, SimpleGrid, ThemeIcon, Card, Table, Box,
    Button, Modal, Textarea, NumberInput, ActionIcon, Tooltip, CopyButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import {
    IconUser, IconCash, IconCheck, IconX, IconCoin,
    IconBan, IconRosetteDiscountCheck, IconCopy, IconLink,
} from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { markCommissionPaid, markCommissionCancelled, toggleResellerStatus, updateCommissionRate } from '@/lib/actions';

interface ResellerData {
    id: string;
    name: string;
    contactEmail: string;
    taxStatus: 'INDIVIDUAL' | 'BUSINESS';
    businessNumber: string | null;
    bankAccount: string | null;
    commissionRate: number;
    status: 'ACTIVE' | 'SUSPENDED';
    notes: string | null;
    createdAt: string;
    user: { id: string; email: string; name: string | null; createdAt: Date };
    referralCodes: Array<{
        id: string; code: string; description: string | null; active: boolean;
        createdAt: string; referralCount: number;
    }>;
    commissions: Array<{
        id: string;
        referredUserId: string;
        referredUser: { id: string; email: string; name: string | null } | null;
        periodYearMonth: string;
        baseRevenue: number;
        commissionRate: number;
        amount: number;
        status: 'PENDING' | 'PAID' | 'CANCELLED';
        paidAt: string | null;
        notes: string | null;
        createdAt: string;
    }>;
}

export default function ResellerDetailClient({ data }: { data: ResellerData }) {
    const [busy, setBusy] = useState(false);
    const [paidModal, paidModalCtl] = useDisclosure(false);
    const [cancelModal, cancelModalCtl] = useDisclosure(false);
    const [rateModal, rateModalCtl] = useDisclosure(false);
    const [selectedCommission, setSelectedCommission] = useState<ResellerData['commissions'][0] | null>(null);
    const [paidNotes, setPaidNotes] = useState('');
    const [cancelNotes, setCancelNotes] = useState('');
    const [newRate, setNewRate] = useState(data.commissionRate * 100);

    const baseUrl = typeof window !== 'undefined' ? window.location.origin.replace('adminbot', 'marketingbot') : 'https://marketingbot.amakers.co.kr';

    const pendingTotal = data.commissions.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0);
    const paidTotal = data.commissions.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amount, 0);
    const totalReferrals = data.referralCodes.reduce((s, c) => s + c.referralCount, 0);

    const openPaidModal = (c: ResellerData['commissions'][0]) => {
        setSelectedCommission(c);
        setPaidNotes('');
        paidModalCtl.open();
    };

    const openCancelModal = (c: ResellerData['commissions'][0]) => {
        setSelectedCommission(c);
        setCancelNotes('');
        cancelModalCtl.open();
    };

    const handlePaid = async () => {
        if (!selectedCommission) return;
        setBusy(true);
        try {
            await markCommissionPaid(selectedCommission.id, paidNotes);
            notifications.show({ color: 'teal', title: '✅ 정산 완료 처리됨', message: `${selectedCommission.periodYearMonth} ₩${selectedCommission.amount.toLocaleString()}` });
            paidModalCtl.close();
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const handleCancel = async () => {
        if (!selectedCommission || !cancelNotes.trim()) return;
        setBusy(true);
        try {
            await markCommissionCancelled(selectedCommission.id, cancelNotes);
            notifications.show({ color: 'orange', title: '❌ Commission 취소됨', message: `${selectedCommission.periodYearMonth}` });
            cancelModalCtl.close();
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!confirm(`정말 ${data.status === 'ACTIVE' ? '정지' : '재활성화'} 하시겠습니까?`)) return;
        setBusy(true);
        try {
            const r = await toggleResellerStatus(data.id);
            notifications.show({ color: 'teal', title: '상태 변경됨', message: r.status });
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const handleUpdateRate = async () => {
        setBusy(true);
        try {
            await updateCommissionRate(data.id, newRate / 100);
            notifications.show({ color: 'teal', title: '수수료율 변경됨', message: `${newRate}%` });
            rateModalCtl.close();
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            {/* 헤더 */}
            <Stack gap={2}>
                <Anchor component={Link} href="/resellers" size="sm">← 리셀러 목록</Anchor>
                <Group gap="sm" align="center" justify="space-between" wrap="wrap">
                    <Group gap="sm">
                        <ThemeIcon size={48} radius="xl" variant="light" color="violet"><IconCoin size={28} /></ThemeIcon>
                        <Stack gap={0}>
                            <Title order={2}>{data.name}</Title>
                            <Group gap={6}>
                                <Anchor component={Link} href={`/users/${data.user.id}`} size="sm">{data.user.email}</Anchor>
                                <Badge size="sm" color={data.status === 'ACTIVE' ? 'teal' : 'red'} variant="light">{data.status}</Badge>
                                <Badge size="sm" color="blue" variant="light">{data.taxStatus === 'BUSINESS' ? '사업자' : '개인 (3.3%)'}</Badge>
                                <Badge size="sm" color="violet" variant="light">{(data.commissionRate * 100).toFixed(0)}% 수수료</Badge>
                            </Group>
                        </Stack>
                    </Group>
                    <Group gap="xs">
                        <Button variant="light" size="xs" onClick={rateModalCtl.open}>수수료율 변경</Button>
                        <Button
                            variant="light"
                            size="xs"
                            color={data.status === 'ACTIVE' ? 'red' : 'teal'}
                            leftSection={data.status === 'ACTIVE' ? <IconBan size={14} /> : <IconRosetteDiscountCheck size={14} />}
                            onClick={handleToggleStatus}
                            loading={busy}
                        >
                            {data.status === 'ACTIVE' ? '정지' : '재활성화'}
                        </Button>
                    </Group>
                </Group>
            </Stack>

            {/* 핵심 지표 */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mt="md">
                <StatCard color="orange" label="정산 대기" value={`₩${pendingTotal.toLocaleString()}`} hint={`${data.commissions.filter(c => c.status === 'PENDING').length}건`} />
                <StatCard color="teal" label="누적 정산 완료" value={`₩${paidTotal.toLocaleString()}`} hint={`${data.commissions.filter(c => c.status === 'PAID').length}건`} />
                <StatCard color="blue" label="추천 사용자" value={`${totalReferrals}명`} />
                <StatCard color="violet" label="활성 코드" value={`${data.referralCodes.filter(c => c.active).length}/${data.referralCodes.length}`} />
            </SimpleGrid>

            {/* 연락처·세금 */}
            <Paper withBorder p="md" radius="md" mt="md">
                <Text fw={700} mb="sm">📋 연락처 / 세금 정보</Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <Field label="연락 이메일" value={data.contactEmail} />
                    <Field label="세금 처리" value={data.taxStatus === 'BUSINESS' ? `사업자 (${data.businessNumber || '-'})` : '개인 (3.3% 원천징수)'} />
                    <Field label="입금 계좌" value={data.bankAccount || '미입력'} />
                    <Field label="등록일" value={dayjs(data.createdAt).format('YYYY-MM-DD')} />
                </SimpleGrid>
            </Paper>

            {/* 추천 코드 */}
            <Paper withBorder p="md" radius="md" mt="md">
                <Text fw={700} mb="sm">🔗 추천 코드 ({data.referralCodes.length}개)</Text>
                <Stack gap="xs">
                    {data.referralCodes.map(c => {
                        const link = `${baseUrl}/register?ref=${c.code}`;
                        return (
                            <Group key={c.id} justify="space-between" wrap="wrap">
                                <Group gap={6}>
                                    <Badge size="lg" color={c.active ? 'violet' : 'gray'} variant="light">{c.code}</Badge>
                                    <Text size="xs" c="dimmed">추천 {c.referralCount}명</Text>
                                    {c.description && <Text size="xs" c="dimmed">· {c.description}</Text>}
                                </Group>
                                <CopyButton value={link}>
                                    {({ copied, copy }) => (
                                        <Tooltip label={copied ? '복사됨!' : '추천 링크 복사'}>
                                            <ActionIcon variant="light" onClick={copy}><IconCopy size={14} /></ActionIcon>
                                        </Tooltip>
                                    )}
                                </CopyButton>
                            </Group>
                        );
                    })}
                </Stack>
            </Paper>

            {/* Commission 내역 */}
            <Paper withBorder p="md" radius="md" mt="md">
                <Text fw={700} mb="sm">💰 Commission 내역 ({data.commissions.length}건)</Text>
                {data.commissions.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                        아직 commission 내역이 없습니다. 매월 1일 cron 이 자동 누적합니다.
                    </Text>
                ) : (
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>기간</Table.Th>
                                <Table.Th>추천 사용자</Table.Th>
                                <Table.Th>결제액</Table.Th>
                                <Table.Th>수수료</Table.Th>
                                <Table.Th>상태</Table.Th>
                                <Table.Th>처리일</Table.Th>
                                <Table.Th>액션</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {data.commissions.map(c => (
                                <Table.Tr key={c.id}>
                                    <Table.Td><Text size="sm" fw={600}>{c.periodYearMonth}</Text></Table.Td>
                                    <Table.Td>
                                        {c.referredUser ? (
                                            <Anchor component={Link} href={`/users/${c.referredUser.id}`} size="sm">
                                                {c.referredUser.email}
                                            </Anchor>
                                        ) : (
                                            <Text size="sm" c="dimmed">(삭제된 사용자)</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td><Text size="sm">₩{c.baseRevenue.toLocaleString()}</Text></Table.Td>
                                    <Table.Td><Text size="sm" fw={700}>₩{c.amount.toLocaleString()}</Text></Table.Td>
                                    <Table.Td>
                                        <Badge size="sm" color={c.status === 'PAID' ? 'teal' : c.status === 'PENDING' ? 'orange' : 'red'} variant="light">
                                            {c.status}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs" c="dimmed">{c.paidAt ? dayjs(c.paidAt).format('YY-MM-DD') : '-'}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        {c.status === 'PENDING' && (
                                            <Group gap={4}>
                                                <Tooltip label="송금 완료 처리">
                                                    <ActionIcon size="sm" color="teal" variant="light" onClick={() => openPaidModal(c)}>
                                                        <IconCheck size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="취소 (환불 등)">
                                                    <ActionIcon size="sm" color="red" variant="light" onClick={() => openCancelModal(c)}>
                                                        <IconX size={14} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        )}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </Paper>

            {/* 송금 완료 모달 */}
            <Modal opened={paidModal} onClose={paidModalCtl.close} title="💸 송금 완료 처리">
                {selectedCommission && (
                    <Stack gap="sm">
                        <Card withBorder p="sm">
                            <Group gap={6}>
                                <Text size="sm" c="dimmed">기간:</Text>
                                <Text size="sm" fw={600}>{selectedCommission.periodYearMonth}</Text>
                            </Group>
                            <Group gap={6}>
                                <Text size="sm" c="dimmed">금액:</Text>
                                <Text size="sm" fw={700} c="teal">₩{selectedCommission.amount.toLocaleString()}</Text>
                            </Group>
                            <Group gap={6}>
                                <Text size="sm" c="dimmed">계좌:</Text>
                                <Text size="sm">{data.bankAccount || '(미입력 — 먼저 리셀러에게 확인)'}</Text>
                            </Group>
                        </Card>
                        <Textarea
                            label="송금 메모 (선택)"
                            placeholder="예: 은행 송금 거래번호 ABC123"
                            value={paidNotes}
                            onChange={(e) => setPaidNotes(e.currentTarget.value)}
                            minRows={2}
                            autosize
                        />
                        <Text size="xs" c="dimmed">
                            ⚠️ 실제로 송금을 마친 후 클릭하세요. PAID 처리 후 되돌리려면 DB 에서 직접 수정해야 합니다.
                        </Text>
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={paidModalCtl.close}>취소</Button>
                            <Button color="teal" onClick={handlePaid} loading={busy} leftSection={<IconCheck size={14} />}>
                                ✅ 송금 완료로 표시
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* 취소 모달 */}
            <Modal opened={cancelModal} onClose={cancelModalCtl.close} title="❌ Commission 취소">
                {selectedCommission && (
                    <Stack gap="sm">
                        <Card withBorder p="sm">
                            <Text size="sm">{selectedCommission.periodYearMonth} · ₩{selectedCommission.amount.toLocaleString()}</Text>
                        </Card>
                        <Textarea
                            label="취소 사유 (필수)"
                            placeholder="예: 사용자 환불로 결제 취소됨"
                            value={cancelNotes}
                            onChange={(e) => setCancelNotes(e.currentTarget.value)}
                            minRows={2}
                            autosize
                            required
                        />
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={cancelModalCtl.close}>닫기</Button>
                            <Button color="red" onClick={handleCancel} loading={busy} disabled={!cancelNotes.trim()}>
                                Commission 취소
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* 수수료율 변경 모달 */}
            <Modal opened={rateModal} onClose={rateModalCtl.close} title="수수료율 변경" size="sm">
                <Stack gap="sm">
                    <NumberInput
                        label="수수료율 (%)"
                        description="기본 10%. 특별 계약 시 조정"
                        min={0}
                        max={100}
                        decimalScale={1}
                        value={newRate}
                        onChange={(v) => setNewRate(Number(v) || 10)}
                        suffix="%"
                    />
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={rateModalCtl.close}>취소</Button>
                        <Button onClick={handleUpdateRate} loading={busy}>저장</Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}

function StatCard({ color, label, value, hint }: { color: string; label: string; value: string; hint?: string }) {
    return (
        <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={600} mb={4}>{label}</Text>
            <Text fw={800} size="20px" c={color}>{value}</Text>
            {hint && <Text size="11px" c="dimmed" mt={2}>{hint}</Text>}
        </Paper>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Text size="xs" c="dimmed">{label}</Text>
            <Text fw={600} size="sm">{value}</Text>
        </Box>
    );
}
