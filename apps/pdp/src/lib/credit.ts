/**
 * Credit billing helper — pdpbot 의 모든 AI 호출이 이 헬퍼를 거쳐 차감.
 *
 * 모델 (마케팅봇·designbot·pdpbot 등 모든 봇 공유):
 *   - UserCredit.balance = 사용자 현재 잔액 (1 credit ≈ ₩100)
 *   - CreditTransaction = 모든 변동 audit log
 *
 * 사용 패턴:
 *   const result = await spendCredits(userId, {
 *     amount: 30,
 *     bot: 'pdpbot',
 *     action: 'INPAINT',
 *     refType: 'OutputImage',
 *     refId: outputId,
 *   });
 *   if (!result.ok) throw new Error('잔액 부족');
 *
 * 차감은 atomic transaction 으로 — 동시 요청에 race condition 없도록.
 */

import { prisma } from './prisma';

export type SpendAction =
    | 'OCR'           // GPT-4 Vision 텍스트 탐지
    | 'INPAINT'       // FLUX 1.1 Pro Fill 인페인팅
    | 'TRANSLATE'     // Claude Opus 번역
    | 'COMPOSE'       // Sharp + 폰트 합성 (소량)
    | 'IMAGE_GEN'     // FLUX / DALL-E 신규 이미지 생성
    | 'PUBLISH'       // 마케팅봇 발행 1회
    | 'PURCHASE'      // 충전 (delta 양수)
    | 'REFUND';       // 환불 (delta 양수)

export interface SpendInput {
    amount: number; // 차감은 양수, refund/purchase 도 양수 (delta 부호는 내부 처리)
    bot: 'pdpbot' | 'marketingbot' | 'designbot' | 'mockupbot';
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
        // upsert UserCredit (없으면 잔액 0 으로 생성)
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

        return {
            ok: true,
            balanceBefore: credit.balance,
            balanceAfter: updated.balance,
        };
    });
}

/** Credit 충전 (PURCHASE / REFUND). delta 는 양수. */
export async function addCredits(
    userId: string,
    delta: number,
    bot: SpendInput['bot'],
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

        return {
            ok: true,
            balanceBefore: credit.balance - delta,
            balanceAfter: credit.balance,
        };
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

// ===== BYOK 통합 차감 + 자동 환불 wrapper =====

import type { ActionKind } from './byok-cost';
import { resolveByokForAction, computeByokAdjustedCost } from './byok-cost';

export interface CreditGuardResult<T> {
    result: T;
    /** BYOK 적용 후 실제 차감 (BYOK 면 0). */
    creditsUsed: number;
    /** 차감 후 잔액 (BYOK 면 변동 X). */
    balanceAfter: number;
    /** 어떤 provider 가 BYOK 였는지 (UI 응답용). */
    byok: boolean;
}

/**
 * BYOK 체크 → spendCredits → 작업 실행 → 실패 시 자동 환불.
 *
 * 5개 routes (analyze, generate-page, generate-section-image, compose-page, process)
 * 의 동일한 try/catch + addCredits(REFUND) 보일러플레이트를 한 곳으로.
 *
 * @throws SpendError 잔액 부족 (route 에서 402 응답)
 * @throws Error      work() 가 throw 한 에러 (이미 환불됨)
 */
export async function withCreditRefund<T>(
    userId: string,
    opts: {
        action: ActionKind;
        baseCost: number;
        bot: SpendInput['bot'];
        refType?: string;
        refId?: string;
        metadata?: Record<string, unknown>;
    },
    work: (ctx: { byok: boolean; userKey: string | null }) => Promise<T>,
): Promise<CreditGuardResult<T>> {
    const { byok, userKey } = await resolveByokForAction(userId, opts.action);
    const adjustedCost = computeByokAdjustedCost(opts.baseCost, byok);

    let spend: SpendResult;
    if (adjustedCost > 0) {
        spend = await spendCredits(userId, {
            amount: adjustedCost,
            bot: opts.bot,
            action: opts.action === 'OUTLINE' ? 'TRANSLATE'
                  : opts.action === 'ANALYZE' ? 'IMAGE_GEN'
                  : opts.action as SpendAction,
            refType: opts.refType,
            refId: opts.refId,
            metadata: { ...opts.metadata, byok, kind: opts.action },
        });
        if (!spend.ok) {
            const e: any = new Error(spend.error || '잔액 부족');
            e.status = 402;
            throw e;
        }
    } else {
        spend = { ok: true, balanceBefore: 0, balanceAfter: 0 };
    }

    try {
        const result = await work({ byok, userKey });
        return { result, creditsUsed: adjustedCost, balanceAfter: spend.balanceAfter, byok };
    } catch (e: any) {
        if (adjustedCost > 0) {
            await addCredits(userId, adjustedCost, opts.bot, 'REFUND', {
                reason: `${opts.action} failed`,
                error: e?.message,
            }).catch(() => {});
        }
        throw e;
    }
}

// ===== 단가표 (조정 시 한 곳만) =====
export const CREDIT_RATES = {
    OCR: 5,           // 이미지 1장 OCR
    INPAINT: 30,      // 이미지 1장 인페인팅 (FLUX)
    TRANSLATE: 5,     // 텍스트 1개 번역
    COMPOSE: 1,       // 합성 (Sharp, 거의 무료)
    IMAGE_GEN: 20,    // 신규 이미지 1장 (FLUX/DALL-E)
    PUBLISH_CLOUD: 1, // 마케팅봇 클라우드 발행
    PUBLISH_AGENT: 2, // 마케팅봇 에이전트 발행
} as const;
