import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, Stack, SimpleGrid, Paper, Group, Badge, Box, Table,
} from '@mantine/core';
import { IconMessage, IconStar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import BarChart from '@/components/BarChart';

export const dynamic = 'force-dynamic';

export default async function FeedbackPage() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email, (session.user as any).role)) redirect('/login');

    const all = await prisma.userFeedback.findMany({
        include: { user: { select: { email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });

    // 분포 (1-5점)
    const distribution = [1, 2, 3, 4, 5].map(r => ({
        label: `${r}점`,
        value: all.filter(f => f.rating === r).length,
    }));

    const total = all.length;
    const sum = all.reduce((s, f) => s + f.rating, 0);
    const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    // NPS 스타일 — 상위 (5점) / 중립 (3-4) / 하위 (1-2)
    const promoters = all.filter(f => f.rating === 5).length;
    const detractors = all.filter(f => f.rating <= 2).length;
    const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;

    // 최근 30일
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();
    const recent = all.filter(f => f.createdAt >= thirtyDaysAgo);

    // 코멘트만 (코멘트 있는 것)
    const withComments = all.filter(f => f.comment?.trim());

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Group gap={6}><IconMessage size={24} /><Title order={2}>💬 사용자 피드백</Title></Group>
                <Text size="sm" c="dimmed">최근 200개 피드백 — 5점 평가 + 코멘트</Text>
            </Stack>

                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                    <KpiCard label="평균 평점" value={`${avg}/5`} hint={`${total}건 누적`} color="yellow" />
                    <KpiCard label="NPS" value={`${nps >= 0 ? '+' : ''}${nps}`} hint={`5점 ${promoters}·1-2점 ${detractors}`} color={nps >= 30 ? 'teal' : nps >= 0 ? 'blue' : 'red'} />
                    <KpiCard label="최근 30일" value={`${recent.length}건`} hint="피드백 활동량" color="violet" />
                    <KpiCard label="코멘트 비율" value={total > 0 ? `${Math.round((withComments.length / total) * 100)}%` : '0%'} hint={`${withComments.length}/${total}`} color="grape" />
                </SimpleGrid>

                {/* 분포 차트 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb="sm"><IconStar size={18} /><Text fw={700}>평점 분포</Text></Group>
                    <BarChart data={distribution} height={140} color="var(--mantine-color-yellow-5)" />
                </Paper>

                {/* 코멘트 목록 */}
                <Paper withBorder p="md" radius="md">
                    <Text fw={700} mb="sm">📝 최근 코멘트 ({withComments.length})</Text>
                    {withComments.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center" py="xl">아직 코멘트가 없습니다</Text>
                    ) : (
                        <Stack gap="xs">
                            {withComments.slice(0, 50).map(f => (
                                <Box key={f.id} style={{
                                    padding: 12,
                                    borderLeft: `3px solid var(--mantine-color-${f.rating <= 2 ? 'red' : f.rating === 3 ? 'orange' : f.rating === 4 ? 'blue' : 'teal'}-5)`,
                                    background: 'var(--mantine-color-default-hover)',
                                    borderRadius: 6,
                                }}>
                                    <Group gap={4} mb={4}>
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <Box key={n} style={{
                                                width: 10, height: 10, borderRadius: 2,
                                                background: n <= f.rating ? 'var(--mantine-color-yellow-5)' : 'var(--mantine-color-gray-3)',
                                            }} />
                                        ))}
                                        <Text size="11px" c="dimmed">{f.user.email}</Text>
                                        <Text size="11px" c="dimmed">·</Text>
                                        <Text size="11px" c="dimmed">{dayjs(f.createdAt).format('YY-MM-DD HH:mm')}</Text>
                                        {f.context && <Badge size="xs" variant="light">{f.context}</Badge>}
                                    </Group>
                                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{f.comment}</Text>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </Paper>

                {/* 코멘트 없는 평점만 — 테이블 */}
                {all.filter(f => !f.comment?.trim()).length > 0 && (
                    <Paper withBorder p="md" radius="md">
                        <Text fw={700} mb="sm">⭐ 평점만 ({all.filter(f => !f.comment?.trim()).length})</Text>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>이메일</Table.Th>
                                    <Table.Th>평점</Table.Th>
                                    <Table.Th>페이지</Table.Th>
                                    <Table.Th>날짜</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {all.filter(f => !f.comment?.trim()).slice(0, 30).map(f => (
                                    <Table.Tr key={f.id}>
                                        <Table.Td><Text size="sm">{f.user.email}</Text></Table.Td>
                                        <Table.Td>
                                            <Badge size="sm" color={f.rating <= 2 ? 'red' : f.rating === 3 ? 'orange' : f.rating === 4 ? 'blue' : 'teal'} variant="light">
                                                {f.rating}/5
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{f.context || '-'}</Text></Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{dayjs(f.createdAt).format('YY-MM-DD HH:mm')}</Text></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Paper>
            )}
        </Stack>
    );
}

function KpiCard({ label, value, hint, color }: { label: string; value: string; hint: string; color: string }) {
    return (
        <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={600} mb={4}>{label}</Text>
            <Text fw={800} size="22px" c={color}>{value}</Text>
            <Text size="11px" c="dimmed" mt={2}>{hint}</Text>
        </Paper>
    );
}
