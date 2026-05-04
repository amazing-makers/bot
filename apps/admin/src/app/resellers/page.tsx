import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Container, Title, Text, Stack, Paper, Group, Anchor, Table, Badge, Button,
} from '@mantine/core';
import Link from 'next/link';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

export default async function ResellersPage() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) redirect('/login');

    const resellers = await prisma.reseller.findMany({
        include: {
            user: { select: { email: true, name: true } },
            referralCodes: { select: { code: true, active: true, _count: { select: { referrals: true } } } },
            _count: { select: { commissions: true } },
        },
        orderBy: { createdAt: 'desc' },
    }).catch(() => [] as any[]); // 마이그레이션 전이면 빈 배열

    return (
        <Container size="xl" py="xl">
            <Stack gap="md">
                <Group justify="space-between">
                    <Stack gap={2}>
                        <Anchor component={Link} href="/" size="sm">← 대시보드</Anchor>
                        <Title order={2}>🤝 리셀러 관리 ({resellers.length}명)</Title>
                    </Stack>
                    <Button component={Link} href="/resellers/new" color="violet">+ 새 리셀러 등록</Button>
                </Group>

                {resellers.length === 0 && (
                    <Paper withBorder p="xl" radius="md">
                        <Stack gap="sm" align="center">
                            <Text size="lg" fw={600}>아직 등록된 리셀러가 없습니다</Text>
                            <Text size="sm" c="dimmed" ta="center">
                                리셀러 모델 마이그레이션 (Phase 다-1) 적용 후 사용 가능합니다.<br />
                                <code>npx prisma migrate deploy</code> 실행 후 새로고침하세요.
                            </Text>
                        </Stack>
                    </Paper>
                )}

                {resellers.length > 0 && (
                    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>이름</Table.Th>
                                    <Table.Th>연락처</Table.Th>
                                    <Table.Th>세금</Table.Th>
                                    <Table.Th>수수료율</Table.Th>
                                    <Table.Th>리퍼럴 코드</Table.Th>
                                    <Table.Th>추천 사용자</Table.Th>
                                    <Table.Th>상태</Table.Th>
                                    <Table.Th>등록일</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {resellers.map((r: any) => {
                                    const totalReferrals = r.referralCodes.reduce((sum: number, c: any) => sum + c._count.referrals, 0);
                                    return (
                                        <Table.Tr key={r.id}>
                                            <Table.Td>
                                                <Anchor component={Link} href={`/resellers/${r.id}`} size="sm" fw={600}>{r.name}</Anchor>
                                                <Text size="xs" c="dimmed">{r.user.email}</Text>
                                            </Table.Td>
                                            <Table.Td><Text size="sm">{r.contactEmail}</Text></Table.Td>
                                            <Table.Td>
                                                <Badge size="xs" variant="light" color={r.taxStatus === 'BUSINESS' ? 'blue' : 'gray'}>
                                                    {r.taxStatus === 'BUSINESS' ? '사업자' : '개인 (3.3%)'}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td><Text size="sm" fw={600}>{(r.commissionRate * 100).toFixed(0)}%</Text></Table.Td>
                                            <Table.Td>
                                                <Stack gap={2}>
                                                    {r.referralCodes.slice(0, 3).map((c: any) => (
                                                        <Badge key={c.code} size="xs" variant="light" color={c.active ? 'teal' : 'gray'}>
                                                            {c.code}
                                                        </Badge>
                                                    ))}
                                                </Stack>
                                            </Table.Td>
                                            <Table.Td><Text size="sm">{totalReferrals}명</Text></Table.Td>
                                            <Table.Td>
                                                <Badge size="sm" color={r.status === 'ACTIVE' ? 'teal' : 'red'} variant="light">
                                                    {r.status}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td><Text size="xs" c="dimmed">{dayjs(r.createdAt).format('YYYY-MM-DD')}</Text></Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </Paper>
                )}
            </Stack>
        </Container>
    );
}
