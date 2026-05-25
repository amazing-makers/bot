/**
 * 관리자/테스트 사용자 시드 (개발용).
 *
 * 빈 공유 DB 초기 셋업 시, 로그인 가능한 계정을 만든다 (bcrypt 해시 — auth.ts 의 bcrypt.compare 와 호환).
 *
 * 사용:
 *   npm run seed:user                                  # 기본: help@amakers.co.kr / !djapdlzjtm1 (ADMIN) + 1000 credits
 *   npm run seed:user -- user@x.com mypassword USER    # 이메일/비번/역할 지정
 *
 * .env.local 의 DATABASE_URL 사용.
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '.prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const DEFAULT_EMAIL = 'help@amakers.co.kr';
const DEFAULT_PASSWORD = '!djapdlzjtm1';
const SEED_CREDITS = 1000;

async function main() {
    const args = process.argv.slice(2);
    const email = (args[0] || DEFAULT_EMAIL).toLowerCase();
    const password = args[1] || DEFAULT_PASSWORD;
    const role = (args[2] || 'ADMIN') as 'ADMIN' | 'USER';

    const url = process.env.DATABASE_URL;
    if (!url || url.includes('REPLACE_ME')) {
        console.error('❌ DATABASE_URL 이 설정되지 않았습니다 (.env.local 확인)');
        process.exit(1);
    }

    const pool = new pg.Pool({ connectionString: url, max: 1 });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const hash = await bcrypt.hash(password, 10);

        const user = await prisma.user.upsert({
            where: { email },
            update: { password: hash, role },
            create: { email, password: hash, name: 'amakers', role },
        });

        await prisma.userCredit.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, balance: SEED_CREDITS },
        });

        console.log(`✅ 계정 준비 완료: ${user.email} (role=${user.role}, id=${user.id})`);
        console.log(`   비밀번호: ${password}`);
        console.log(`   크레딧: 최소 ${SEED_CREDITS} 보장`);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch((e) => {
    console.error('❌ 오류:', e?.message || e);
    process.exit(1);
});
