'use server';

import { auth } from '@/auth';
import { isAdminEmail } from '@amakers/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import dayjs from 'dayjs';
import { sendBroadcastEmail, simpleMarkdownToHtml } from '@/lib/email';

async function requireAdminSession() {
    const session = await auth();
    if (!session?.user || !isAdminEmail(session.user.email, (session.user as any).role)) {
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
 * Phase 46 — 다수 사용자 트라이얼 일괄 연장.
 * extendUserTrial 을 순차 호출 (트랜잭션 X — 일부 실패해도 나머지 진행).
 */
export async function bulkExtendTrial(input: {
    userIds: string[];
    days: number;
    reason?: string;
}): Promise<{ ok: boolean; success: number; failed: number; errors: string[] }> {
    const admin = await requireAdminSession();
    if (input.userIds.length === 0) throw new Error('대상 사용자가 없습니다');
    if (input.userIds.length > 200) throw new Error('한 번에 최대 200명까지 처리 가능');
    if (input.days < 1 || input.days > 365) throw new Error('연장 일수는 1-365일');

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of input.userIds) {
        try {
            // extendUserTrial 의 핵심 로직 직접 호출 (audit 로그 1번씩 생성)
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true },
            });
            if (!user) {
                failed++;
                if (errors.length < 5) errors.push(`${userId}: not found`);
                continue;
            }

            const existing = await prisma.license.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });

            let newValidUntil: Date;
            if (existing) {
                const base = existing.validUntil && existing.validUntil > new Date() ? existing.validUntil : new Date();
                newValidUntil = dayjs(base).add(input.days, 'day').toDate();
                await prisma.license.update({
                    where: { id: existing.id },
                    data: { validUntil: newValidUntil },
                });
            } else {
                newValidUntil = dayjs().add(input.days, 'day').toDate();
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

            success++;
        } catch (e: any) {
            failed++;
            if (errors.length < 5) errors.push(`${input.userIds[0]}: ${e?.message}`);
        }
    }

    // 일괄 작업 단일 audit 로그
    await recordAudit({
        adminEmail: admin.email!,
        action: 'BULK_TRIAL_EXTEND',
        targetType: 'users',
        targetLabel: `${success}/${input.userIds.length}명 연장 ${input.days}일`,
        metadata: {
            userCount: input.userIds.length,
            days: input.days,
            success,
            failed,
            reason: input.reason?.trim() || null,
        },
    });

    revalidatePath('/users');
    return { ok: true, success, failed, errors };
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

/**
 * Phase 49 — 사용자 ADMIN 권한 토글.
 * USER ↔ ADMIN. 자기 자신 강등 방지 (마지막 ADMIN 보호).
 */
export async function toggleUserAdminRole(userId: string, reason?: string) {
    const admin = await requireAdminSession();

    const target = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
    });
    if (!target) throw new Error('사용자 미존재');

    const next: 'USER' | 'ADMIN' = target.role === 'ADMIN' ? 'USER' : 'ADMIN';

    // 자기 자신 강등 방지
    if (next === 'USER' && admin.email === target.email) {
        throw new Error('자기 자신을 강등할 수 없습니다');
    }

    // 마지막 ADMIN 보호 (전체 ADMIN 이 1명일 때 강등 차단)
    if (next === 'USER') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) throw new Error('마지막 관리자는 강등할 수 없습니다');
    }

    await prisma.user.update({
        where: { id: userId },
        data: { role: next },
    });

    await recordAudit({
        adminEmail: admin.email!,
        action: next === 'ADMIN' ? 'ADMIN_GRANT' : 'ADMIN_REVOKE',
        targetType: 'user',
        targetId: userId,
        targetLabel: target.email,
        metadata: { from: target.role, to: next, reason: reason?.trim() || null },
    });

    revalidatePath('/users/[id]', 'page');
    revalidatePath('/users');
    return { ok: true, role: next };
}

// ════════════════════════════════════════════════════════════
//  Phase 32 — 브로드캐스트 이메일
// ════════════════════════════════════════════════════════════

export type BroadcastFilter = {
    plan?: 'ALL' | 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'PAID';
    quick?: 'all' | 'paid' | 'free' | 'reseller' | 'referred';
    signedUpAfter?: string; // ISO date
};

/**
 * 필터 조건에 맞는 사용자 수만 조회 (보내기 전 미리보기).
 */
export async function previewBroadcast(filter: BroadcastFilter): Promise<{ count: number; sampleEmails: string[] }> {
    await requireAdminSession();
    const where = buildBroadcastWhere(filter);
    const [count, sample] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({ where, select: { email: true }, take: 5 }),
    ]);
    return { count, sampleEmails: sample.map(s => s.email).filter(Boolean) as string[] };
}

/**
 * 실제 발송. subject + bodyMarkdown 받아 simpleMarkdownToHtml 로 변환 후 sequential 발송.
 * 매 50건마다 200ms 대기 (rate limit 회피).
 */
export async function sendBroadcast(input: {
    filter: BroadcastFilter;
    subject: string;
    bodyMarkdown: string;
    fromName?: string;
}): Promise<{ ok: boolean; sent: number; failed: number; sampleErrors: string[] }> {
    const admin = await requireAdminSession();
    if (!input.subject?.trim()) throw new Error('제목은 필수입니다');
    if (!input.bodyMarkdown?.trim()) throw new Error('본문은 필수입니다');

    const where = buildBroadcastWhere(input.filter);
    const users = await prisma.user.findMany({ where, select: { id: true, email: true, name: true } });
    if (users.length === 0) throw new Error('대상 사용자가 없습니다');
    if (users.length > 5000) throw new Error('한 번에 5000명까지 발송 가능합니다 (현재: ' + users.length + ')');

    const html = simpleMarkdownToHtml(input.bodyMarkdown);
    let sent = 0;
    let failed = 0;
    const sampleErrors: string[] = [];

    for (let i = 0; i < users.length; i++) {
        const u = users[i];
        if (!u.email) continue;
        const r = await sendBroadcastEmail({
            to: u.email,
            subject: input.subject,
            html,
            fromName: input.fromName?.trim() || undefined,
        });
        if (r.ok) sent++;
        else {
            failed++;
            if (sampleErrors.length < 5) sampleErrors.push(`${u.email}: ${r.error}`);
        }
        // rate limit: 50건마다 200ms 대기
        if ((i + 1) % 50 === 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    await recordAudit({
        adminEmail: admin.email!,
        action: 'BROADCAST_EMAIL',
        targetType: 'broadcast',
        targetLabel: `${sent}명 발송 / ${failed} 실패 — "${input.subject.slice(0, 60)}"`,
        metadata: {
            filter: input.filter,
            subject: input.subject,
            bodyPreview: input.bodyMarkdown.slice(0, 200),
            sent,
            failed,
            totalCandidates: users.length,
        },
    });

    return { ok: true, sent, failed, sampleErrors };
}

function buildBroadcastWhere(filter: BroadcastFilter): any {
    const where: any = {};
    if (filter.plan && filter.plan !== 'ALL') {
        if (filter.plan === 'PAID') {
            where.subscription = { plan: { not: 'FREE' }, status: 'active' };
        } else if (filter.plan === 'FREE') {
            where.AND = [{ OR: [{ subscription: null }, { subscription: { plan: 'FREE' } }] }];
        } else {
            where.subscription = { plan: filter.plan };
        }
    }
    if (filter.quick === 'paid') where.subscription = { ...where.subscription, plan: { not: 'FREE' }, status: 'active' };
    else if (filter.quick === 'free') where.AND = [{ OR: [{ subscription: null }, { subscription: { plan: 'FREE' } }] }];
    else if (filter.quick === 'reseller') where.reseller = { isNot: null };
    else if (filter.quick === 'referred') where.referredByCodeId = { not: null };

    if (filter.signedUpAfter) {
        where.createdAt = { gte: new Date(filter.signedUpAfter) };
    }
    // 안전: email 없는 사용자 제외
    where.email = { not: null };
    return where;
}
