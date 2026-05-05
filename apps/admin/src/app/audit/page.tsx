import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, Stack, Paper, Group, Badge, Box, Code,
} from '@mantine/core';
import { IconHistory, IconUser, IconShield } from '@tabler/icons-react';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

const ACTION_COLORS: Record<string, string> = {
    TRIAL_EXTEND: 'green',
    SUBSCRIPTION_FORCE_CANCEL: 'red',
    COMMISSION_PAID: 'teal',
    COMMISSION_CANCELLED: 'orange',
    COMMISSION_RATE_UPDATE: 'blue',
    RESELLER_STATUS_TOGGLE: 'violet',
};

const ACTION_LABELS: Record<string, string> = {
    TRIAL_EXTEND: '🎁 트라이얼 연장',
    SUBSCRIPTION_FORCE_CANCEL: '⛔ 구독 강제 취소',
    COMMISSION_PAID: '💰 Commission 송금 완료',
    COMMISSION_CANCELLED: '❌ Commission 취소',
    COMMISSION_RATE_UPDATE: '📊 Commission 율 변경',
    RESELLER_STATUS_TOGGLE: '🤝 리셀러 상태 토글',
};

interface PageProps {
    searchParams: Promise<{ action?: string; admin?: string }>;
}

export default async function AuditLogPage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) redirect('/login');

    const sp = await searchParams;

    const where: any = {};
    if (sp.action) where.action = sp.action;
    if (sp.admin) where.adminEmail = sp.admin;

    const logs = await prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
    }).catch(() => [] as any[]); // 마이그레이션 전이면 빈 배열

    // 통계
    const byAction: Record<string, number> = {};
    for (const l of logs) byAction[l.action] = (byAction[l.action] || 0) + 1;

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Group gap={6}><IconHistory size={24} /><Title order={2}>📜 감사 로그</Title></Group>
                <Text size="sm" c="dimmed">
                    슈퍼관리자 mutating 액션 기록 (최근 200건). 모든 admin 작업은 자동으로 기록됩니다.
                </Text>
            </Stack>

            {logs.length === 0 ? (
                <Paper withBorder p="xl" radius="md">
                    <Stack gap="md" align="center" py="xl">
                        <IconShield size={48} style={{ opacity: 0.3 }} />
                        <Stack gap={4} align="center">
                            <Text fw={700}>아직 감사 로그가 없습니다</Text>
                            <Text size="sm" c="dimmed" ta="center" maw={500}>
                                <strong>AdminAuditLog</strong> 테이블이 생성된 후 admin 액션 (트라이얼 연장, commission 송금 등)을 수행하면 여기에 기록됩니다.<br /><br />
                                <Code>cd c:\amakers-platform\apps\admin && npx prisma db push</Code> 실행 후 새로고침하세요.
                            </Text>
                        </Stack>
                    </Stack>
                </Paper>
            ) : (
                <>
                    {/* 액션별 통계 */}
                    <Paper withBorder p="md" radius="md">
                        <Text fw={700} size="sm" mb="sm">액션 분포 (최근 200건)</Text>
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
                                            <Text size="11px" c="dimmed">{log.adminEmail}</Text>
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
