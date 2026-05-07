import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
    Title, Text, Badge, Group, Anchor, TextInput, Stack, Paper, Select, Button, Pagination,
} from '@mantine/core';
import Link from 'next/link';
import UsersTableClient from './UsersTableClient';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

interface PageProps {
    searchParams: Promise<{ q?: string; plan?: string; sort?: string; page?: string; quick?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email, (session.user as any).role)) redirect('/login');

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
                <Anchor href="/users" size="xs">
                    <Badge size="md" variant={!quick ? 'filled' : 'light'} color="gray">전체</Badge>
                </Anchor>
                <Anchor href="/users?quick=paid" size="xs">
                    <Badge size="md" variant={quick === 'paid' ? 'filled' : 'light'} color="teal">💰 유료</Badge>
                </Anchor>
                <Anchor href="/users?quick=free" size="xs">
                    <Badge size="md" variant={quick === 'free' ? 'filled' : 'light'} color="gray">🆓 무료</Badge>
                </Anchor>
                <Anchor href="/users?quick=reseller" size="xs">
                    <Badge size="md" variant={quick === 'reseller' ? 'filled' : 'light'} color="violet">🤝 리셀러</Badge>
                </Anchor>
                <Anchor href="/users?quick=referred" size="xs">
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

            <UsersTableClient
                users={users.map(u => ({
                    id: u.id,
                    email: u.email,
                    name: u.name,
                    createdAt: u.createdAt.toISOString(),
                    subscription: u.subscription
                        ? { plan: u.subscription.plan, status: u.subscription.status }
                        : null,
                    _count: u._count,
                    referredByCode: u.referredByCode
                        ? { code: u.referredByCode.code, reseller: u.referredByCode.reseller }
                        : null,
                }))}
            />

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
