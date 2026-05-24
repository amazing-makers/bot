/**
 * Credits 충전 script (개발용).
 *   npm run seed:credits -- 1000               # admin@amakers.co.kr 에 1000 credits
 *   npm run seed:credits -- 1000 user@x.com    # 특정 이메일에 충전
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const DEFAULT_EMAIL = 'admin@amakers.co.kr';

async function main() {
    const args = process.argv.slice(2);
    const amount = parseInt(args[0] || '1000', 10);
    const email = args[1] || DEFAULT_EMAIL;

    if (isNaN(amount) || amount <= 0) {
        console.error('❌ 첫 인자는 양수여야 합니다 — 예: npm run seed:credits -- 1000');
        process.exit(1);
    }

    const prisma = new PrismaClient();

    try {
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            console.error(`❌ 사용자 ${email} 를 찾을 수 없습니다. 먼저 마케팅봇/다른 봇에서 회원가입하세요.`);
            process.exit(1);
        }

        const result = await prisma.$transaction(async (tx) => {
            const credit = await tx.userCredit.upsert({
                where: { userId: user.id },
                update: { balance: { increment: amount } },
                create: { userId: user.id, balance: amount },
            });
            await tx.creditTransaction.create({
                data: {
                    userCreditId: credit.id,
                    delta: amount,
                    balanceAfter: credit.balance,
                    bot: 'blogbot',
                    action: 'PURCHASE',
                    metadata: { source: 'seed-credits.ts', cli: true } as any,
                },
            });
            return credit;
        });

        console.log(`✅ ${email} (${user.id}) 에 ${amount} credits 충전 완료 — 현재 잔액: ${result.balance}`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error('❌ 오류:', e?.message || e);
    process.exit(1);
});
