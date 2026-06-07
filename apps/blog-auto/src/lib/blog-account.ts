/**
 * 블로그 계정 연결 관리 — 자격증명 암호화 저장/조회/검증.
 *
 * Phase 1: WordPress (REST API + Application Password). 네이버블로그는 Phase 2(에이전트).
 */

import { prisma } from './prisma';
import { encrypt, decrypt } from './crypto';
import { verifyWordPressCredentials, type WordPressCredentials } from './publishers/wordpress';

/**
 * WordPress 계정 연결 (또는 자격증명 갱신).
 * 먼저 REST API 로 검증 → Application Password 암호화 저장.
 */
export async function connectWordPress(
    userId: string,
    siteUrl: string,
    username: string,
    appPassword: string,
): Promise<{ ok: boolean; accountId?: string; username?: string; error?: string }> {
    const creds: WordPressCredentials = { siteUrl: siteUrl.trim(), username: username.trim(), appPassword: appPassword.trim() };
    const verified = await verifyWordPressCredentials(creds);
    if (!verified.ok) {
        return { ok: false, error: verified.error };
    }

    const encryptedSecret = encrypt(creds.appPassword);

    const account = await prisma.blogAccount.upsert({
        where: { userId_provider_siteUrl: { userId, provider: 'WORDPRESS', siteUrl: creds.siteUrl } },
        update: { username: creds.username, encryptedSecret, status: 'ACTIVE' },
        create: {
            userId,
            provider: 'WORDPRESS',
            siteUrl: creds.siteUrl,
            username: creds.username,
            encryptedSecret,
            status: 'ACTIVE',
        },
    });

    return { ok: true, accountId: account.id, username: verified.username || creds.username };
}

/** 네이버 블로그 연결 — 자격증명 없이 blogId만(실제 발행은 데스크톱 에이전트 세션). */
export async function connectNaver(
    userId: string,
    blogId: string,
): Promise<{ ok: boolean; accountId?: string; username?: string; error?: string }> {
    const id = blogId.trim().replace(/^@/, '').replace(/^https?:\/\/blog\.naver\.com\//, '').replace(/\/.*$/, '');
    if (!id) return { ok: false, error: '네이버 블로그 ID를 입력하세요' };
    const siteUrl = `https://blog.naver.com/${id}`;
    const account = await prisma.blogAccount.upsert({
        where: { userId_provider_siteUrl: { userId, provider: 'NAVER', siteUrl } },
        update: { username: id, status: 'ACTIVE' },
        create: { userId, provider: 'NAVER', siteUrl, username: id, encryptedSecret: encrypt('agent-session'), status: 'ACTIVE' },
    });
    return { ok: true, accountId: account.id, username: id };
}

/** 사용자 계정 목록 (자격증명 미반환). */
export async function listAccounts(userId: string) {
    return prisma.blogAccount.findMany({
        where: { userId },
        select: {
            id: true,
            provider: true,
            siteUrl: true,
            username: true,
            status: true,
            createdAt: true,
            _count: { select: { posts: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

/** 발행용 WordPress 자격증명 조회 (복호화). 소유자 확인 포함. */
export async function getWordPressCredentials(
    userId: string,
    accountId: string,
): Promise<WordPressCredentials | null> {
    const account = await prisma.blogAccount.findFirst({
        where: { id: accountId, userId, provider: 'WORDPRESS' },
        select: { siteUrl: true, username: true, encryptedSecret: true },
    });
    if (!account) return null;
    try {
        return {
            siteUrl: account.siteUrl,
            username: account.username,
            appPassword: decrypt(account.encryptedSecret),
        };
    } catch (e) {
        console.error('[blog-account] 자격증명 복호화 실패', e);
        return null;
    }
}

/** 계정 연결 해제. */
export async function deleteAccount(userId: string, accountId: string): Promise<boolean> {
    try {
        await prisma.blogAccount.delete({ where: { id: accountId, userId } });
        return true;
    } catch {
        return false;
    }
}
