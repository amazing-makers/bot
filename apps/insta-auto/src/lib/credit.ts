/**
 * Credit billing helper — instaauto 발행이 이 헬퍼로 차감.
 *
 * 통합 잔액 (모든 봇 공유):
 *   - UserCredit.balance = 사용자 현재 잔액
 *   - CreditTransaction = 모든 변동 audit log (bot 필드로 봇별 분리)
 *
 * 차감은 atomic transaction — 동시 요청 race condition 방지.
 */

import { prisma } from './prisma';

export type Bot = 'instaauto' | 'marketingbot' | 'pdpbot' | 'designbot' | 'mockupbot' | 'adminbot';

export type SpendAction = 'PUBLISH' | 'AI_CAPTION' | 'AI_IMAGE' | 'PURCHASE' | 'REFUND';

export interface SpendInput {
    amount: number;
    bot: Bot;
    action: SpendAction;
    refType?: string;
    refId?: string;
    metadata?: Record<string, unknown>;
}

export interface SpendResult {
    ok: boolean;
    balanceBefore: number;
    balanceAfter: number;
    error?: string;
}

/** 양수 amount 만큼 차감. 잔액 부족 시 ok:false. */
export async function spendCredits(userId: string, input: SpendInput): Promise<SpendResult> {
    if (input.amount <= 0) {
        return { ok: false, balanceBefore: 0, balanceAfter: 0, error: 'amount 는 양수여야 합니다' };
    }

    return prisma.$transaction(async (tx) => {
        const credit = await tx.userCredit.upsert({
            where: { userId },
            update: {},
            create: { userId, balance: 0 },
        });

        if (credit.balance < input.amount) {
            return {
                ok: false,
                balanceBefore: credit.balance,
                balanceAfter: credit.balance,
                error: `credit 잔액 부족 (필요: ${input.amount}, 보유: ${credit.balance})`,
            };
        }

        const updated = await tx.userCredit.update({
            where: { id: credit.id },
            data: { balance: { decrement: input.amount } },
        });

        await tx.creditTransaction.create({
            data: {
                userCreditId: credit.id,
                delta: -input.amount,
                balanceAfter: updated.balance,
                bot: input.bot,
                action: input.action,
                refType: input.refType,
                refId: input.refId,
                metadata: (input.metadata as any) ?? undefined,
            },
        });

        return { ok: true, balanceBefore: credit.balance, balanceAfter: updated.balance };
    });
}

/** Credit 충전/환불 (delta 양수). */
export async function addCredits(
    userId: string,
    delta: number,
    bot: Bot,
    action: 'PURCHASE' | 'REFUND',
    metadata?: Record<string, unknown>,
): Promise<SpendResult> {
    if (delta <= 0) {
        return { ok: false, balanceBefore: 0, balanceAfter: 0, error: 'delta 는 양수여야 합니다' };
    }

    return prisma.$transaction(async (tx) => {
        const credit = await tx.userCredit.upsert({
            where: { userId },
            update: { balance: { increment: delta } },
            create: { userId, balance: delta },
        });

        await tx.creditTransaction.create({
            data: {
                userCreditId: credit.id,
                delta,
                balanceAfter: credit.balance,
                bot,
                action,
                metadata: (metadata as any) ?? undefined,
            },
        });

        return { ok: true, balanceBefore: credit.balance - delta, balanceAfter: credit.balance };
    });
}

/** 현재 잔액 조회. */
export async function getBalance(userId: string): Promise<number> {
    const credit = await prisma.userCredit.findUnique({
        where: { userId },
        select: { balance: true },
    });
    return credit?.balance ?? 0;
}

// ===== 단가표 (조정 시 한 곳만) =====
export const CREDIT_RATES = {
    PUBLISH: 1, // 인스타 발행 1회 (Graph API, 클라우드)
    AI_CAPTION: 3, // AI 캡션 생성 1회
    AI_IMAGE: 20, // AI 이미지 생성 1장
} as const;
