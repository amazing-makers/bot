/**
 * 티스토리 블로그 등록 관리.
 *
 * ⚠️ 티스토리는 공개 발행 API 가 없어 자동 발행은 데스크톱 에이전트(Phase 2)가 카카오 로그인으로 처리.
 *    따라서 연결 단계에선 블로그 주소만 등록(검증 없음). 카카오 세션 등은 추후 encryptedSecret 에 저장.
 */

import { prisma } from './prisma';

function normalizeSiteUrl(url: string): string {
    let u = url.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    return u;
}

/** 티스토리 블로그 등록 (또는 갱신). */
export async function connectTistory(
    userId: string,
    siteUrl: string,
    username: string,
): Promise<{ ok: boolean; accountId?: string; error?: string }> {
    const site = normalizeSiteUrl(siteUrl);
    if (!site) return { ok: false, error: '블로그 주소를 입력하세요 (예: myblog.tistory.com)' };

    const account = await prisma.tistoryAccount.upsert({
        where: { userId_siteUrl: { userId, siteUrl: site } },
        update: { username: username.trim() || site, status: 'ACTIVE' },
        create: { userId, siteUrl: site, username: username.trim() || site, status: 'ACTIVE' },
    });

    return { ok: true, accountId: account.id };
}

/** 사용자 블로그 목록. */
export async function listAccounts(userId: string) {
    return prisma.tistoryAccount.findMany({
        where: { userId },
        select: {
            id: true,
            siteUrl: true,
            username: true,
            status: true,
            createdAt: true,
            _count: { select: { posts: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

/** 블로그 등록 해제. */
export async function deleteAccount(userId: string, accountId: string): Promise<boolean> {
    try {
        await prisma.tistoryAccount.delete({ where: { id: accountId, userId } });
        return true;
    } catch {
        return false;
    }
}
