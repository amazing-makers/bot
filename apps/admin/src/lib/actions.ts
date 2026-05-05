'use server';

import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function requireAdminSession() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) {
        throw new Error('FORBIDDEN');
    }
    return session.user;
}

/**
 * Commission 을 PAID 로 표시 (관리자가 송금 완료 후 클릭).
 */
export async function markCommissionPaid(commissionId: string, notes?: string) {
    await requireAdminSession();
    await prisma.referralCommission.update({
        where: { id: commissionId },
        data: { status: 'PAID', paidAt: new Date(), notes: notes?.trim() || undefined },
    });
    revalidatePath('/resellers/[id]', 'page');
    revalidatePath('/resellers');
    return { ok: true };
}

/**
 * Commission 을 CANCELLED (예: 환불 처리).
 */
export async function markCommissionCancelled(commissionId: string, notes: string) {
    await requireAdminSession();
    if (!notes?.trim()) throw new Error('취소 사유를 입력하세요');
    await prisma.referralCommission.update({
        where: { id: commissionId },
        data: { status: 'CANCELLED', notes: notes.trim() },
    });
    revalidatePath('/resellers/[id]', 'page');
    return { ok: true };
}

/**
 * 리셀러 상태 토글 (ACTIVE / SUSPENDED).
 */
export async function toggleResellerStatus(resellerId: string) {
    await requireAdminSession();
    const r = await prisma.reseller.findUnique({ where: { id: resellerId }, select: { status: true } });
    if (!r) throw new Error('Reseller not found');
    const next = r.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await prisma.reseller.update({ where: { id: resellerId }, data: { status: next } });
    revalidatePath('/resellers/[id]', 'page');
    revalidatePath('/resellers');
    return { ok: true, status: next };
}

/**
 * 리셀러 commission 율 변경 (예: 특별 계약).
 */
export async function updateCommissionRate(resellerId: string, rate: number) {
    await requireAdminSession();
    if (rate < 0 || rate > 1) throw new Error('수수료율은 0 ~ 1 사이여야 합니다');
    await prisma.reseller.update({ where: { id: resellerId }, data: { commissionRate: rate } });
    revalidatePath('/resellers/[id]', 'page');
    return { ok: true };
}
