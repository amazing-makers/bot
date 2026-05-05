'use server';

import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import dayjs from 'dayjs';

async function requireAdminSession() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email)) {
        throw new Error('FORBIDDEN');
    }
    return session.user;
}

/**
 * Phase 31 — 모든 admin mutating 액션은 이 헬퍼를 호출해서 감사 로그 남김.
 * 예외: read-only 조회는 기록하지 않음 (user 검색 등).
 */
async function recordAudit(input: {
    adminEmail: string;
    action: string;
    targetType?: string;
    targetId?: string;
    targetLabel?: string;
    metadata?: Record<string, any>;
}): Promise<void> {
    try {
        const h = await headers();
        const ipAddress = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null;
        const userAgent = h.get('user-agent') || null;
        await prisma.adminAuditLog.create({
            data: {
                adminEmail: input.adminEmail,
                action: input.action,
                targetType: input.targetType,
                targetId: input.targetId,
                targetLabel: input.targetLabel,
                metadata: input.metadata as any,
                ipAddress,
                userAgent: userAgent?.slice(0, 300) || undefined,
            },
        });
    } catch (e) {
        // 감사 로그 실패가 액션을 막지 않도록 silent. 단, 로그는 남김.
        console.warn('[audit] log failed', e);
    }
}

/**
 * Commission 을 PAID 로 표시 (관리자가 송금 완료 후 클릭).
 */
export async function markCommissionPaid(commissionId: string, notes?: string) {
    const admin = await requireAdminSession();
    const c = await prisma.referralCommission.findUnique({
        where: { id: commissionId },
        select: { id: true, amount: true, periodYearMonth: true, reseller: { select: { name: true } } },
    });
    await prisma.referralCommission.update({
        where: { id: commissionId },
        data: { status: 'PAID', paidAt: new Date(), notes: notes?.trim() || undefined },
    });
    await recordAudit({
        adminEmail: admin.email!,
        action: 'COMMISSION_PAID',
        targetType: 'commission',
        targetId: commissionId,
        targetLabel: c ? `${c.reseller.name} · ${c.periodYearMonth}` : undefined,
        metadata: { amount: c ? Number(c.amount) : undefined, notes: notes?.trim() || null },
    });
    revalidatePath('/resellers/[id]', 'page');
    revalidatePath('/resellers');
    return { ok: true };
}

/**
 * Commission 을 CANCELLED (예: 환불 처리).
 */
export async function markCommissionCancelled(commissionId: string, notes: string) {
    const admin = await requireAdminSession();
    if (!notes?.trim()) throw new Error('취소 사유를 입력하세요');
    const c = await prisma.referralCommission.findUnique({
        where: { id: commissionId },
        select: { amount: true, periodYearMonth: true, reseller: { select: { name: true } } },
    });
    await prisma.referralCommission.update({
        where: { id: commissionId },
        data: { status: 'CANCELLED', notes: notes.trim() },
    });
    await recordAudit({
        adminEmail: admin.email!,
        action: 'COMMISSION_CANCELLED',
        targetType: 'commission',
        targetId: commissionId,
        targetLabel: c ? `${c.reseller.name} · ${c.periodYearMonth}` : undefined,
        metadata: { amount: c ? Number(c.amount) : undefined, reason: notes.trim() },
    });
    revalidatePath('/resellers/[id]', 'page');
    return { ok: true };
}

/**
 * 리셀러 상태 토글 (ACTIVE / SUSPENDED).
 */
export async function toggleResellerStatus(resellerId: string) {
    const admin = await requireAdminSession();
    const r = await prisma.reseller.findUnique({ where: { id: resellerId }, select: { status: true, name: true } });
    if (!r) throw new Error('Reseller not found');
    const next = r.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    await prisma.reseller.update({ where: { id: resellerId }, data: { status: next } });
    await recordAudit({
        adminEmail: admin.email!,
        action: 'RESELLER_STATUS_TOGGLE',
        targetType: 'reseller',
        targetId: resellerId,
        targetLabel: r.name,
        metadata: { from: r.status, to: next },
    });
    revalidatePath('/resellers/[id]', 'page');
    revalidatePath('/resellers');
    return { ok: true, status: next };
}

/**
 * 리셀러 commission 율 변경 (예: 특별 계약).
 */
export async function updateCommissionRate(resellerId: string, rate: number) {
    const admin = await requireAdminSession();
    if (rate < 0 || rate > 1) throw new Error('수수료율은 0 ~ 1 사이여야 합니다');
    const before = await prisma.reseller.findUnique({ where: { id: resellerId }, select: { commissionRate: true, name: true } });
    await prisma.reseller.update({ where: { id: resellerId }, data: { commissionRate: rate } });
    await recordAudit({
        adminEmail: admin.email!,
        action: 'COMMISSION_RATE_UPDATE',
        targetType: 'reseller',
        targetId: resellerId,
        targetLabel: before?.name || undefined,
        metadata: { from: before?.commissionRate, to: rate },
    });
    revalidatePath('/resellers/[id]', 'page');
    return { ok: true };
}

/**
 * Phase 31 — 사용자 트라이얼 라이센스 N일 연장.
 * 기존 라이센스가 있으면 validUntil 만 연장, 없으면 새로 생성.
 */
export async function extendUserTrial(userId: string, days: number, reason?: string) {
    const admin = await requireAdminSession();
    if (days < 1 || days > 365) throw new Error('연장 일수는 1~365 사이여야 합니다');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true },
    });
    if (!user) throw new Error('사용자 미존재');

    const existing = await prisma.license.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    let newValidUntil: Date;
    if (existing) {
        const base = existing.validUntil && existing.validUntil > new Date() ? existing.validUntil : new Date();
        newValidUntil = dayjs(base).add(days, 'day').toDate();
        await prisma.license.update({
            where: { id: existing.id },
            data: { validUntil: newValidUntil },
        });
    } else {
        newValidUntil = dayjs().add(days, 'day').toDate();
        const generateKey = () => {
            const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
            return `MB-${part()}-${part()}-${part()}-${part()}`;
        };
        await prisma.license.create({
            data: {
                id: `lic_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                userId,
                key: generateKey(),
                plan: 'FREE_TRIAL',
                validUntil: newValidUntil,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }

    await recordAudit({
        adminEmail: admin.email!,
        action: 'TRIAL_EXTEND',
        targetType: 'user',
        targetId: userId,
        targetLabel: user.email,
        metadata: { days, newValidUntil: newValidUntil.toISOString(), reason: reason?.trim() || null },
    });

    revalidatePath('/users/[id]', 'page');
    revalidatePath('/users');
    return { ok: true, newValidUntil: newValidUntil.toISOString() };
}

/**
 * Phase 31 — 사용자 구독 강제 취소 (환불 후 후속 처리 등).
 * Stripe 측은 별도 처리, 여기서는 DB 만 업데이트.
 */
export async function forceCancelSubscription(userId: string, reason: string) {
    const admin = await requireAdminSession();
    if (!reason?.trim()) throw new Error('취소 사유는 필수입니다');

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, subscription: { select: { id: true, plan: true, status: true } } },
    });
    if (!user) throw new Error('사용자 미존재');
    if (!user.subscription) throw new Error('활성 구독 없음');

    await prisma.subscription.update({
        where: { id: user.subscription.id },
        data: { status: 'cancelled', cancelAtPeriodEnd: true },
    });

    await recordAudit({
        adminEmail: admin.email!,
        action: 'SUBSCRIPTION_FORCE_CANCEL',
        targetType: 'user',
        targetId: userId,
        targetLabel: user.email,
        metadata: { previousPlan: user.subscription.plan, previousStatus: user.subscription.status, reason: reason.trim() },
    });

    revalidatePath('/users/[id]', 'page');
    return { ok: true };
}
