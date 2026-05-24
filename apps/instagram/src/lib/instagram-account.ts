/**
 * 인스타 계정 연결 관리 — 토큰 암호화 저장/조회/검증.
 *
 * 토큰은 AES-256-GCM (lib/crypto) 으로 암호화해 InstagramAccount.encryptedAccessToken 에 저장.
 * 복호화 plaintext 는 발행 시점에만 메모리에 잠깐 — DB/응답에 절대 노출 X.
 */

import { prisma } from './prisma';
import { encrypt, decrypt } from './crypto';
import { verifyInstagramCredentials, type InstagramCredentials } from './publishers/instagram';

const LONG_LIVED_TOKEN_DAYS = 60;

/**
 * IG 계정 연결 (또는 토큰 갱신).
 * 토큰을 먼저 Graph API 로 검증 → username/followers 확보 후 암호화 저장.
 */
export async function connectAccount(
    userId: string,
    accessToken: string,
    igUserId: string,
): Promise<{ ok: boolean; accountId?: string; username?: string; error?: string }> {
    const verified = await verifyInstagramCredentials(accessToken, igUserId);
    if (!verified.ok) {
        return { ok: false, error: verified.error };
    }

    const encryptedAccessToken = encrypt(accessToken.trim());
    const tokenExpiresAt = new Date(Date.now() + LONG_LIVED_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    const account = await prisma.instagramAccount.upsert({
        where: { userId_igUserId: { userId, igUserId } },
        update: {
            username: verified.username!,
            followers: verified.followers,
            encryptedAccessToken,
            tokenExpiresAt,
            status: 'ACTIVE',
        },
        create: {
            userId,
            igUserId,
            username: verified.username!,
            followers: verified.followers,
            encryptedAccessToken,
            tokenExpiresAt,
            status: 'ACTIVE',
        },
    });

    return { ok: true, accountId: account.id, username: verified.username };
}

/** 사용자 계정 목록 (토큰은 반환 X — UI 안전). */
export async function listAccounts(userId: string) {
    return prisma.instagramAccount.findMany({
        where: { userId },
        select: {
            id: true,
            igUserId: true,
            username: true,
            followers: true,
            status: true,
            tokenExpiresAt: true,
            createdAt: true,
            _count: { select: { posts: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

/** 발행용 자격증명 조회 (복호화). 소유자 확인 포함. */
export async function getAccountCredentials(
    userId: string,
    accountId: string,
): Promise<InstagramCredentials | null> {
    const account = await prisma.instagramAccount.findFirst({
        where: { id: accountId, userId },
        select: { igUserId: true, encryptedAccessToken: true },
    });
    if (!account) return null;
    try {
        return { accessToken: decrypt(account.encryptedAccessToken), igUserId: account.igUserId };
    } catch (e) {
        console.error('[instagram-account] 토큰 복호화 실패', e);
        return null;
    }
}

/** 계정 연결 해제. */
export async function deleteAccount(userId: string, accountId: string): Promise<boolean> {
    try {
        await prisma.instagramAccount.delete({ where: { id: accountId, userId } });
        return true;
    } catch {
        return false;
    }
}
