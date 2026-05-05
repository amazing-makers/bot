import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, Table, Badge, Group, Anchor, TextInput, Stack, Paper, Select, Button, Pagination,
} from '@mantine/core';
import Link from 'next/link';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

interface PageProps {
    searchParams: Promise<{ q?: string; plan?: string; sort?: string; page?: string; quick?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) redirect('/login');

    const sp = await searchParams;
    const search = sp.q?.trim();
    const planFilter = sp.plan;
    const sort = sp.sort || 'createdAt-desc';
    const page = Math.max(1, parseInt(sp.page || '1', 10));
    const quick = sp.quick;

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
    // Phase 31 — 빠른 필터
    if (quick === 'paid') {
        where.subscription = { ...where.subscription, plan: { not: 'FREE' }, status: 'active' };
    } else if (quick === 'free') {
        where.OR = where.OR || [];
        where.AND = [{ OR: [{ subscription: null }, { subscription: { plan: 'FREE' } }] }];
    } else if (quick === 'reseller') {
        where.reseller = { isNot: null };
    } else if (quick === 'referred') {
        where.referredByCodeId = { not: null };
    }

    // 정렬 옵션
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'createdAt-asc') orderBy = { createdAt: 'asc' };
    else if (sort === 'email-asc') orderBy = { email: 'asc' };
    else if (sort === 'campaigns-desc') orderBy = { campaigns: { _count: 'desc' } };

    const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
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
            orderBy,
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
        }),
    ]);

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // CSV 익스포트 URL
    const csvParams = new URLSearchParams();
    if (search) csvParams.set('q', search);
    if (planFilter) csvParams.set('plan', planFilter);
    if (sort) csvParams.set('sort', sort);
    if (quick) csvParams.set('quick', quick);
    const csvUrl = `/users/export?${csvParams.toString()}`;

    const buildPageUrl = (p: number) => {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (planFilter) params.set('plan', planFilter);
        if (sort !== 'createdAt-desc') params.set('sort', sort);
        if (quick) params.set('quick', quick);
        params.set('page', String(p));
        return `/users?${params.toString()}`;
    };

    return (
        <Stack gap="md">
            <Group justify="space-between">
                <Stack gap={2}>
                    <Title order={2}>👥 사용자 관리</Title>
                    <Text size="sm" c="dimmed">{total.toLocaleString()}명 · 페이지 {page}/{pageCount}</Text>
                </Stack>
                <Button component="a" href={csvUrl} variant="light" color="teal">📥 CSV 익스포트</Button>
            </Group>

            {/* 빠른 필터 */}
            <Group gap="xs">
                <Anchor component={Link} href="/users" size="xs">
                    <Badge size="md" variant={!quick ? 'filled' : 'light'} color="gray">전체</Badge>
                </Anchor>
                <Anchor component={Link} href="/users?quick=paid" size="xs">
                    <Badge size="md" variant={quick === 'paid' ? 'filled' : 'light'} color="teal">💰 유료</Badge>
                </Anchor>
                <Anchor component={Link} href="/users?quick=free" size="xs">
                    <Badge size="md" variant={quick === 'free' ? 'filled' : 'light'} color="gray">🆓 무료</Badge>
                </Anchor>
                <Anchor component={Link} href="/users?quick=reseller" size="xs">
                    <Badge size="md" variant={quick === 'reseller' ? 'filled' : 'light'} color="violet">🤝 리셀러</Badge>
                </Anchor>
                <Anchor component={Link} href="/users?quick=referred" size="xs">
                    <Badge size="md" variant={quick === 'referred' ? 'filled' : 'light'} color="cyan">🎁 추천 가입</Badge>
                </Anchor>
            </Group>

            <Paper withBorder p="md" radius="md">
                <form>
                    <Group gap="xs" align="flex-end">
                        <TextInput
                            name="q"
                            defaultValue={search}
                            placeholder="이메일 또는 이름 검색"
                            style={{ flex: 1 }}
                            label="검색"
                        />
                        <Select
                            name="plan"
                            defaultValue={planFilter || ''}
                            data={[
                                { value: '', label: '전체 플랜' },
                                { value: 'FREE', label: 'FREE' },
                                { value: 'STARTER', label: 'STARTER' },
                                { value: 'PRO', label: 'PRO' },
                                { value: 'BUSINESS', label: 'BUSINESS' },
                            ]}
                            label="플랜"
                            w={140}
                        />
                        <Select
                            name="sort"
                            defaultValue={sort}
                            data={[
                                { value: 'createdAt-desc', label: '최근 가입순' },
                                { value: 'createdAt-asc', label: '오래된 가입순' },
                                { value: 'email-asc', label: '이메일순' },
                                { value: 'campaigns-desc', label: '캠페인 많은순' },
                            ]}
                            label="정렬"
                            w={160}
                        />
                        {quick && <input type="hidden" name="quick" value={quick} />}
                        <Button type="submit">검색</Button>
                    </Group>
                </form>
            </Paper>

            <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                <Table.ScrollContainer minWidth={900}>
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
                </Table.ScrollContainer>
            </Paper>

            {/* Pagination */}
            {pageCount > 1 && (
                <Group justify="center">
                    <Pagination
                        total={pageCount}
                        value={page}
                        siblings={1}
                        boundaries={1}
                        getItemProps={(p) => ({ component: Link as any, href: buildPageUrl(p) }) as any}
                        getControlProps={(control) => {
                            if (control === 'previous') return { component: Link as any, href: buildPageUrl(Math.max(1, page - 1)) } as any;
                            if (control === 'next') return { component: Link as any, href: buildPageUrl(Math.min(pageCount, page + 1)) } as any;
                            if (control === 'first') return { component: Link as any, href: buildPageUrl(1) } as any;
                            if (control === 'last') return { component: Link as any, href: buildPageUrl(pageCount) } as any;
                            return {};
                        }}
                    />
                </Group>
            )}
        </Stack>
    );
}
