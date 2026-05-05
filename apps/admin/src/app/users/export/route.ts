import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

export const dynamic = 'force-dynamic';

/**
 * Phase 31 — 사용자 목록 CSV 익스포트.
 * /users 페이지의 필터·검색·정렬을 그대로 적용.
 */
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) {
        return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const search = sp.get('q')?.trim();
    const planFilter = sp.get('plan') || undefined;
    const sort = sp.get('sort') || 'createdAt-desc';
    const quick = sp.get('quick') || undefined;

    const where: any = {};
    if (search) {
        where.OR = [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
        ];
    }
    if (planFilter) where.subscription = { plan: planFilter };
    if (quick === 'paid') where.subscription = { ...where.subscription, plan: { not: 'FREE' }, status: 'active' };
    else if (quick === 'free') where.AND = [{ OR: [{ subscription: null }, { subscription: { plan: 'FREE' } }] }];
    else if (quick === 'reseller') where.reseller = { isNot: null };
    else if (quick === 'referred') where.referredByCodeId = { not: null };

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'createdAt-asc') orderBy = { createdAt: 'asc' };
    else if (sort === 'email-asc') orderBy = { email: 'asc' };
    else if (sort === 'campaigns-desc') orderBy = { campaigns: { _count: 'desc' } };

    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
            _count: { select: { campaigns: true, channels: true, series: true } },
            referredByCode: { select: { code: true, reseller: { select: { name: true } } } },
        },
        orderBy,
        take: 5000, // 안전 상한
    });

    // CSV 생성 — UTF-8 BOM 포함 (엑셀 한글 깨짐 방지)
    const escape = (v: any): string => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };

    const headers = [
        'id', 'email', 'name', 'createdAt', 'plan', 'status', 'currentPeriodEnd',
        'campaigns', 'channels', 'series', 'referralCode', 'referrerName',
    ];
    const rows = users.map(u => [
        u.id,
        u.email,
        u.name || '',
        dayjs(u.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        u.subscription?.plan || 'FREE',
        u.subscription?.status || '',
        u.subscription?.currentPeriodEnd ? dayjs(u.subscription.currentPeriodEnd).format('YYYY-MM-DD') : '',
        u._count.campaigns,
        u._count.channels,
        u._count.series,
        u.referredByCode?.code || '',
        u.referredByCode?.reseller.name || '',
    ]);

    const csv = '﻿' + // BOM for Excel UTF-8
        headers.join(',') + '\n' +
        rows.map(r => r.map(escape).join(',')).join('\n');

    const filename = `amakers-users-${dayjs().format('YYYYMMDD-HHmmss')}.csv`;
    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
