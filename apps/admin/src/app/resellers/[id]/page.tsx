import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Stack } from '@mantine/core';
import ResellerDetailClient from './ResellerDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ResellerDetailPage({ params }: PageProps) {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) redirect('/login');

    const { id } = await params;

    const reseller = await prisma.reseller.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, email: true, name: true, createdAt: true } },
            referralCodes: {
                include: { _count: { select: { referrals: true } } },
                orderBy: { createdAt: 'desc' },
            },
            commissions: {
                orderBy: [{ status: 'asc' }, { periodYearMonth: 'desc' }],
            },
        },
    });

    if (!reseller) notFound();

    // 추천 사용자 정보 별도 조회 (referredUserId → User)
    const referredUserIds = [...new Set(reseller.commissions.map(c => c.referredUserId))];
    const referredUsers = referredUserIds.length > 0
        ? await prisma.user.findMany({
              where: { id: { in: referredUserIds } },
              select: { id: true, email: true, name: true },
          })
        : [];

    const userMap = new Map(referredUsers.map(u => [u.id, u]));

    // Decimal → number 직렬화 (client component 로 넘기기 위해)
    const data = {
        id: reseller.id,
        name: reseller.name,
        contactEmail: reseller.contactEmail,
        taxStatus: reseller.taxStatus as 'INDIVIDUAL' | 'BUSINESS',
        businessNumber: reseller.businessNumber,
        bankAccount: reseller.bankAccount,
        commissionRate: reseller.commissionRate,
        status: reseller.status as 'ACTIVE' | 'SUSPENDED',
        notes: reseller.notes,
        createdAt: reseller.createdAt.toISOString(),
        user: reseller.user,
        referralCodes: reseller.referralCodes.map(c => ({
            id: c.id,
            code: c.code,
            description: c.description,
            active: c.active,
            createdAt: c.createdAt.toISOString(),
            referralCount: c._count.referrals,
        })),
        commissions: reseller.commissions.map(c => ({
            id: c.id,
            referredUserId: c.referredUserId,
            referredUser: userMap.get(c.referredUserId) || null,
            periodYearMonth: c.periodYearMonth,
            baseRevenue: Number(c.baseRevenue),
            commissionRate: c.commissionRate,
            amount: Number(c.amount),
            status: c.status as 'PENDING' | 'PAID' | 'CANCELLED',
            paidAt: c.paidAt?.toISOString() || null,
            notes: c.notes,
            createdAt: c.createdAt.toISOString(),
        })),
    };

    return (
        <Stack gap="md">
            <ResellerDetailClient data={data} />
        </Stack>
    );
}
