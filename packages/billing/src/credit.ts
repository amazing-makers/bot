/**
 * @amakers/billing — 통합 크레딧 지갑 (전 봇 공유 잔액).
 *
 *   - UserCredit.balance = 사용자 현재 잔액 (모든 봇 공유)
 *   - CreditTransaction = 모든 변동 audit log (bot 필드로 봇별 분리)
 *
 * 차감은 atomic $transaction — 동시 요청 race 방지.
 * 멱등성: refType+refId 가 주어지면 동일 (bot,action,refType,refId) 차감이 이미 있는지 확인 →
 *         재시도(네트워크 재호출 등) 시 이중 차감 방지.
 */

import { prisma } from '@amakers/db';
import type { Bot, LedgerAction } from './rates';

export type { Bot } from './rates';
export type SpendAction = LedgerAction;

export interface SpendInput {
  amount: number;
  bot: Bot;
  action: LedgerAction;
  refType?: string;
  refId?: string;
  /** 멱등 차감: refType+refId 와 함께 쓰면 동일 작업 재시도 시 이중 차감 방지 */
  idempotent?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SpendResult {
  ok: boolean;
  balanceBefore: number;
  balanceAfter: number;
  /** 멱등 차감으로 이미 처리된 건이라 새로 차감하지 않음 */
  deduped?: boolean;
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

    // 멱등 차감 — 같은 작업이 이미 과금됐으면 재차감 안 함.
    if (input.idempotent && input.refType && input.refId) {
      const existing = await tx.creditTransaction.findFirst({
        where: {
          userCreditId: credit.id,
          bot: input.bot,
          action: input.action,
          refType: input.refType,
          refId: input.refId,
          delta: { lt: 0 },
        },
        select: { id: true },
      });
      if (existing) {
        return {
          ok: true,
          deduped: true,
          balanceBefore: credit.balance,
          balanceAfter: credit.balance,
        };
      }
    }

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

/** Credit 충전/환불/구독그랜트 (delta 양수). */
export async function addCredits(
  userId: string,
  delta: number,
  bot: Bot,
  action: 'PURCHASE' | 'REFUND' | 'SUBSCRIPTION_GRANT',
  opts?: { refType?: string; refId?: string; metadata?: Record<string, unknown> },
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
        refType: opts?.refType,
        refId: opts?.refId,
        metadata: (opts?.metadata as any) ?? undefined,
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

/** 최근 거래 내역 (허브 /billing 표시용). */
export async function listTransactions(userId: string, take = 50) {
  const credit = await prisma.userCredit.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!credit) return [];
  return prisma.creditTransaction.findMany({
    where: { userCreditId: credit.id },
    orderBy: { createdAt: 'desc' },
    take,
  });
}
