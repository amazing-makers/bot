import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Container, Title, Text, Table, Badge, Group, Anchor, TextInput, Stack, Paper,
} from '@mantine/core';
import Link from 'next/link';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{ q?: string; plan?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) redirect('/login');

    const sp = await searchParams;
    const search = sp.q?.trim();
    const planFilter = sp.plan;

    const where: any = {};
    if (search) {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (planFilter) {
        where.subscription = { plan: planFilter };
    }

    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            subscription: {
                select: { plan: true, status: true, currentPeriodEnd: true },
            },
            _count: {
                select: { campaigns: true, channels: true, series: true },
            },
            referredByCode: {
                select: { code: true, reseller: { select: { name: true } } },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });

    return (
        <Container size="xl" py="xl">
            <Stack gap="md">
                <Group justify="space-between">
                    <Stack gap={2}>
                        <Anchor component={Link} href="/" size="sm">← 대시보드</Anchor>
                        <Title order={2}>👥 사용자 관리 ({users.length}명)</Title>
                    </Stack>
                </Group>

                <Paper withBorder p="md" radius="md">
                    <form>
                        <Group>
                            <TextInput
                                name="q"
                                defaultValue={search}
                                placeholder="이메일 또는 이름 검색"
                                style={{ flex: 1 }}
                            />
                            <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--mantine-color-default-border)', cursor: 'pointer' }}>
                                검색
                            </button>
                        </Group>
                    </form>
                </Paper>

                <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
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
                                return (
                                    <Table.Tr key={u.id}>
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
                </Paper>
            </Stack>
        </Container>
    );
}
