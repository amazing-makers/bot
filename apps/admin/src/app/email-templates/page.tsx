import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import {
    Title, Text, Stack, Paper, Badge, Group, SimpleGrid, Code, Box,
} from '@mantine/core';
import { IconMail, IconClock, IconCalendar } from '@tabler/icons-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: '이메일 템플릿 · Amakers Admin' };

interface TemplateInfo {
    name: string;
    file: string;
    subject: string;
    trigger: string;
    cron?: string;
    dedup?: string;
    audience: string;
    description: string;
    category: 'transactional' | 'lifecycle' | 'operational';
}

const TEMPLATES: TemplateInfo[] = [
    {
        name: 'Welcome',
        file: 'lib/email/templates/Welcome.tsx',
        subject: '[마케팅봇] 가입을 환영합니다 🎉',
        trigger: '회원가입 직후 동기 발송',
        audience: '신규 가입자',
        description: '환영 메시지 + 라이센스 키 + 대시보드 링크',
        category: 'transactional',
    },
    {
        name: 'TrialExpiring',
        file: 'lib/email/templates/TrialExpiring.tsx',
        subject: '⏰ 마케팅봇 체험 D-N — 결제 추천',
        trigger: 'cron 매일 09 KST',
        cron: '/api/cron/trial-reminders',
        dedup: '24h',
        audience: 'FREE_TRIAL D-7/D-3/D-1 사용자',
        description: '체험 만료 N일 전 알림 + 업그레이드 CTA',
        category: 'lifecycle',
    },
    {
        name: 'TrialRecovery',
        file: 'lib/email/templates/TrialRecovery.tsx',
        subject: '○○님, 마케팅봇이 더 강력해졌어요 ✨',
        trigger: 'cron 매일 10 KST',
        cron: '/api/cron/trial-recovery',
        dedup: '영구 1회',
        audience: 'FREE_TRIAL 만료 D+7~8일 + 미결제',
        description: 'win-back 이메일 — 신규 기능 소개 + 재가입 유도',
        category: 'lifecycle',
    },
    {
        name: 'Day1Reminder',
        file: 'lib/email/templates/Day1Reminder.tsx',
        subject: '○○님, 첫 게시물 만들기 도와드릴까요? 🚀',
        trigger: 'cron 매일 15 KST',
        cron: '/api/cron/day1-reminder',
        dedup: '영구 1회',
        audience: '가입 24-48h + 첫 캠페인 안 만든 사용자',
        description: '온보딩 리마인드 — 채널 유무에 따라 다른 카피',
        category: 'lifecycle',
    },
    {
        name: 'WeeklyReport',
        file: 'lib/email/templates/WeeklyReport.tsx',
        subject: '[마케팅봇] 주간 활동 리포트가 도착했습니다 📊',
        trigger: 'cron 매주 월요일 09 KST',
        cron: '/api/cron/email-weekly-report',
        audience: '활성 사용자 (지난주 task 1건+)',
        description: '주간 발행 통계 + 전주 대비 delta + 베스트 캠페인',
        category: 'lifecycle',
    },
    {
        name: 'NotificationDigest',
        file: 'lib/email/templates/NotificationDigest.tsx',
        subject: '○○님, 미확인 알림 N건이 있어요 📬',
        trigger: 'cron 매일 14 KST',
        cron: '/api/cron/notification-digest',
        dedup: '7일',
        audience: '7일+ 미읽은 알림 5건+ 사용자',
        description: '미확인 알림 묶음 요약',
        category: 'lifecycle',
    },
    {
        name: 'TaskFailureSummary',
        file: 'lib/email/templates/TaskFailureSummary.tsx',
        subject: '[마케팅봇] 어제 발행 실패 task 요약',
        trigger: 'cron 매일 09 KST',
        cron: '/api/cron/email-task-summary',
        audience: '전일 FAILED task 3건+ 사용자',
        description: '실패 task 요약 + 채널별 빈도 + 재시도 안내',
        category: 'operational',
    },
    {
        name: 'NewDeviceLogin',
        file: 'lib/email/templates/NewDeviceLogin.tsx',
        subject: '🔐 [마케팅봇] 새 위치에서 로그인',
        trigger: '로그인 직후 (UA+IP fingerprint 새로움)',
        dedup: '90일',
        audience: '익숙하지 않은 IP/디바이스 로그인 사용자',
        description: '보안 알림 — IP·UA·시간 + 비밀번호 변경 CTA',
        category: 'transactional',
    },
    {
        name: 'SeriesCompleted',
        file: 'lib/email/templates/SeriesCompleted.tsx',
        subject: '🤖 시리즈 "○○" 완료',
        trigger: '시리즈 status COMPLETED 전환 시',
        dedup: '시리즈당 1회 (notifiedCompletedAt 플래그)',
        audience: '시리즈 보유 사용자',
        description: '시리즈 자동 발행 종료 알림 + 통계',
        category: 'transactional',
    },
    {
        name: 'PartnerNotifications',
        file: 'lib/email/templates/PartnerNotifications.tsx',
        subject: '🎉 ○○○ — 새 추천 사용자 가입',
        trigger: '추천 코드로 가입자 발생 시',
        audience: '활성 리셀러·파트너',
        description: '신규 추천 가입자 안내 + 파트너 대시보드 링크',
        category: 'transactional',
    },
    {
        name: 'WorkspaceInvitation',
        file: 'lib/email/templates/WorkspaceInvitation.tsx',
        subject: '○○○이 마케팅봇 워크스페이스로 초대했어요',
        trigger: 'inviteToWorkspace 액션 호출 시',
        audience: '초대받은 이메일',
        description: '워크스페이스 초대 + 24h 만료 토큰',
        category: 'transactional',
    },
];

const CATEGORY_INFO: Record<string, { label: string; color: string; description: string }> = {
    transactional: { label: '트랜잭션', color: 'blue', description: '특정 이벤트 발생 시 즉시 발송' },
    lifecycle: { label: '라이프사이클', color: 'violet', description: '사용자 단계별 자동 이메일 (cron)' },
    operational: { label: '운영', color: 'orange', description: '시스템 운영 관련 알림' },
};

export default async function EmailTemplatesPage() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) redirect('/login');

    const grouped: Record<string, TemplateInfo[]> = {};
    for (const t of TEMPLATES) {
        (grouped[t.category] ||= []).push(t);
    }

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Group gap={6}>
                    <IconMail size={24} />
                    <Title order={2}>📨 이메일 템플릿</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    마케팅봇이 사용자에게 발송하는 모든 이메일 템플릿. 트리거·dedup·대상 한눈에 파악.
                </Text>
            </Stack>

            {Object.entries(grouped).map(([cat, list]) => {
                const meta = CATEGORY_INFO[cat];
                return (
                    <Paper key={cat} withBorder p="md" radius="md">
                        <Group gap={6} mb="md">
                            <Badge size="md" color={meta.color} variant="light">{meta.label}</Badge>
                            <Text size="sm" c="dimmed">{meta.description}</Text>
                            <Badge size="xs" variant="outline" color="gray">{list.length}개</Badge>
                        </Group>
                        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                            {list.map(t => (
                                <Paper key={t.name} withBorder p="md" radius="md">
                                    <Stack gap={6}>
                                        <Group justify="space-between" wrap="nowrap">
                                            <Text fw={700}>{t.name}</Text>
                                            <Code style={{ fontSize: 10 }}>{t.file}</Code>
                                        </Group>
                                        <Box>
                                            <Text size="11px" c="dimmed" fw={600} mb={2}>제목</Text>
                                            <Text size="sm">{t.subject}</Text>
                                        </Box>
                                        <Box>
                                            <Text size="11px" c="dimmed" fw={600} mb={2}>설명</Text>
                                            <Text size="xs">{t.description}</Text>
                                        </Box>
                                        <Group gap="xs" wrap="wrap">
                                            <Group gap={3}>
                                                <IconClock size={11} color="var(--mantine-color-dimmed)" />
                                                <Text size="11px" c="dimmed">{t.trigger}</Text>
                                            </Group>
                                            {t.cron && (
                                                <Code style={{ fontSize: 10 }}>{t.cron}</Code>
                                            )}
                                            {t.dedup && (
                                                <Badge size="xs" variant="light" color="orange">
                                                    dedup: {t.dedup}
                                                </Badge>
                                            )}
                                        </Group>
                                        <Group gap={4}>
                                            <Text size="11px" c="dimmed" fw={600}>대상:</Text>
                                            <Text size="11px" c="dimmed">{t.audience}</Text>
                                        </Group>
                                    </Stack>
                                </Paper>
                            ))}
                        </SimpleGrid>
                    </Paper>
                );
            })}

            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-default-hover)">
                <Text size="xs" c="dimmed">
                    💡 신규 템플릿 추가 시: <Code style={{ fontSize: 11 }}>marketingbot/src/lib/email/templates/</Code> 에 React Email 컴포넌트 작성 →
                    이 페이지의 <Code style={{ fontSize: 11 }}>TEMPLATES</Code> 배열에 메타데이터 추가.
                    실제 미리보기는 <Code style={{ fontSize: 11 }}>react-email dev</Code> 또는 dev 환경에서 cron 직접 호출.
                </Text>
            </Paper>
        </Stack>
    );
}
