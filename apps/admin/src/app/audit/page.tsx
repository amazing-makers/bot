import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, Stack, Paper, Group, Badge, Box, Code, Select, TextInput, Button, Anchor,
} from '@mantine/core';
import { IconHistory, IconUser, IconShield, IconFilter, IconX, IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ACTION_COLORS: Record<string, string> = {
    TRIAL_EXTEND: 'green',
    SUBSCRIPTION_FORCE_CANCEL: 'red',
    COMMISSION_PAID: 'teal',
    COMMISSION_CANCELLED: 'orange',
    COMMISSION_RATE_UPDATE: 'blue',
    RESELLER_STATUS_TOGGLE: 'violet',
    BROADCAST_EMAIL: 'pink',
};

const ACTION_LABELS: Record<string, string> = {
    TRIAL_EXTEND: '🎁 트라이얼 연장',
    SUBSCRIPTION_FORCE_CANCEL: '⛔ 구독 강제 취소',
    COMMISSION_PAID: '💰 Commission 송금 완료',
    COMMISSION_CANCELLED: '❌ Commission 취소',
    COMMISSION_RATE_UPDATE: '📊 Commission 율 변경',
    RESELLER_STATUS_TOGGLE: '🤝 리셀러 상태 토글',
    BROADCAST_EMAIL: '📣 이메일 브로드캐스트',
};

interface PageProps {
    searchParams: Promise<{
        action?: string;
        admin?: string;
        q?: string;
        from?: string;
        to?: string;
    }>;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email, (session.user as any).role)) redirect('/login');

    const sp = await searchParams;

    const where: any = {};
    if (sp.action) where.action = sp.action;
    if (sp.admin) where.adminEmail = sp.admin;
    if (sp.q?.trim()) {
        const q = sp.q.trim();
        where.OR = [
            { targetLabel: { contains: q, mode: 'insensitive' } },
            { adminEmail: { contains: q, mode: 'insensitive' } },
        ];
    }
    if (sp.from || sp.to) {
        where.createdAt = {};
        if (sp.from) where.createdAt.gte = new Date(sp.from);
        if (sp.to) where.createdAt.lte = dayjs(sp.to).endOf('day').toDate();
    }

    const [logs, allActions, allAdmins] = await Promise.all([
        prisma.adminAuditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 200,
        }).catch(() => [] as any[]),
        prisma.adminAuditLog.groupBy({
            by: ['action'],
            _count: { _all: true },
            orderBy: { _count: { action: 'desc' } },
        }).catch(() => [] as any[]),
        prisma.adminAuditLog.groupBy({
            by: ['adminEmail'],
            _count: { _all: true },
            orderBy: { _count: { adminEmail: 'desc' } },
        }).catch(() => [] as any[]),
    ]);

    // 통계 (현재 필터 적용된 결과)
    const byAction: Record<string, number> = {};
    for (const l of logs) byAction[l.action] = (byAction[l.action] || 0) + 1;

    const hasFilters = !!(sp.action || sp.admin || sp.q || sp.from || sp.to);

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Group gap={6}><IconHistory size={24} /><Title order={2}>📜 감사 로그</Title></Group>
                <Text size="sm" c="dimmed">
                    슈퍼관리자 mutating 액션 기록. 모든 admin 작업은 자동으로 기록됩니다 (최대 200건 표시).
                </Text>
            </Stack>

            {/* Phase 35 — 필터 */}
            <Paper withBorder p="md" radius="md">
                <Group gap={6} mb="sm">
                    <IconFilter size={16} />
                    <Text fw={700} size="sm">필터</Text>
                    {hasFilters && (
                        <Anchor component={Link} href="/audit" size="xs" c="red">
                            <Group gap={2}><IconX size={11} /><span>초기화</span></Group>
                        </Anchor>
                    )}
                </Group>
                <form>
                    <Group gap="xs" align="flex-end" wrap="wrap">
                        <Select
                            label="액션"
                            name="action"
                            defaultValue={sp.action || ''}
                            data={[
                                { value: '', label: '전체 액션' },
                                ...allActions.map((a: any) => ({
                                    value: a.action,
                                    label: `${ACTION_LABELS[a.action] || a.action} (${a._count._all})`,
                                })),
                            ]}
                            w={240}
                            clearable
                        />
                        <Select
                            label="관리자"
                            name="admin"
                            defaultValue={sp.admin || ''}
                            data={[
                                { value: '', label: '전체 관리자' },
                                ...allAdmins.map((a: any) => ({
                                    value: a.adminEmail,
                                    label: `${a.adminEmail} (${a._count._all})`,
                                })),
                            ]}
                            w={260}
                            clearable
                            searchable
                        />
                        <TextInput
                            label="대상·이메일 검색"
                            name="q"
                            defaultValue={sp.q || ''}
                            placeholder="홍길동 또는 user@..."
                            w={200}
                        />
                        <TextInput
                            label="시작 날짜"
                            name="from"
                            type="date"
                            defaultValue={sp.from || ''}
                            leftSection={<IconCalendar size={14} />}
                            w={170}
                        />
                        <TextInput
                            label="종료 날짜"
                            name="to"
                            type="date"
                            defaultValue={sp.to || ''}
                            leftSection={<IconCalendar size={14} />}
                            w={170}
                        />
                        <Button type="submit">적용</Button>
                    </Group>
                </form>
            </Paper>

            {logs.length === 0 ? (
                <Paper withBorder p="xl" radius="md">
                    <Stack gap="md" align="center" py="xl">
                        <IconShield size={48} style={{ opacity: 0.3 }} />
                        <Stack gap={4} align="center">
                            <Text fw={700}>
                                {hasFilters ? '조건에 맞는 로그가 없습니다' : '아직 감사 로그가 없습니다'}
                            </Text>
                            {!hasFilters && (
                                <Text size="sm" c="dimmed" ta="center" maw={500}>
                                    <strong>AdminAuditLog</strong> 테이블이 생성된 후 admin 액션을 수행하면 여기에 기록됩니다.<br /><br />
                                    <Code>cd c:\amakers-platform\apps\admin && npx prisma db push</Code> 실행 후 새로고침하세요.
                                </Text>
                            )}
                        </Stack>
                    </Stack>
                </Paper>
            ) : (
                <>
                    {/* 액션별 통계 */}
                    <Paper withBorder p="md" radius="md">
                        <Group justify="space-between" mb="sm">
                            <Text fw={700} size="sm">표시 중 ({logs.length}건)</Text>
                            <Text size="xs" c="dimmed">
                                {logs.length > 0 && `${dayjs(logs[logs.length - 1].createdAt).format('M.D')} ~ ${dayjs(logs[0].createdAt).format('M.D HH:mm')}`}
                            </Text>
                        </Group>
                        <Group gap="xs">
                            {Object.entries(byAction).sort((a, b) => b[1] - a[1]).map(([action, count]) => (
                                <Badge key={action} size="md" color={ACTION_COLORS[action] || 'gray'} variant="light">
                                    {ACTION_LABELS[action] || action}: {count}
                                </Badge>
                            ))}
                        </Group>
                    </Paper>

                    {/* 타임라인 */}
                    <Paper withBorder p="md" radius="md">
                        <Text fw={700} mb="sm">활동 타임라인</Text>
                        <Stack gap="xs">
                            {logs.map((log: any) => {
                                const color = ACTION_COLORS[log.action] || 'gray';
                                const label = ACTION_LABELS[log.action] || log.action;
                                return (
                                    <Box key={log.id} style={{
                                        padding: 12,
                                        borderLeft: `3px solid var(--mantine-color-${color}-6)`,
                                        background: 'var(--mantine-color-default-hover)',
                                        borderRadius: 6,
                                    }}>
                                        <Group justify="space-between" wrap="nowrap" gap="md" mb={4}>
                                            <Group gap={6} wrap="nowrap">
                                                <Badge size="sm" color={color} variant="light">{label}</Badge>
                                                {log.targetLabel && (
                                                    <Text size="xs" fw={600}>{log.targetLabel}</Text>
                                                )}
                                            </Group>
                                            <Text size="11px" c="dimmed">{dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                                        </Group>
                                        <Group gap={6} mb={4}>
                                            <IconUser size={11} color="var(--mantine-color-dimmed)" />
                                            <Anchor component={Link} href={`/audit?admin=${encodeURIComponent(log.adminEmail)}`} size="11px">
                                                {log.adminEmail}
                                            </Anchor>
                                            {log.ipAddress && <Text size="11px" c="dimmed">· IP {log.ipAddress}</Text>}
                                        </Group>
                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                            <Code style={{ fontSize: 10, wordBreak: 'break-all' }}>
                                                {JSON.stringify(log.metadata)}
                                            </Code>
                                        )}
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                </>
            )}
        </Stack>
    );
}
