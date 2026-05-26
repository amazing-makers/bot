/**
 * BYOK — 사용자 외부 AI 키 저장/조회 (AES-256-GCM, lib/crypto).
 *
 * provider:
 *   - gemini  → Google AI (무료 티어, aistudio.google.com)
 *   - groq    → Groq (무료 티어, console.groq.com)
 *
 * 키는 암호화 저장, 복호화는 호출 시점에만. plaintext 는 DB·응답에 노출 X (maskedHint 만 표시).
 */

import { prisma } from './prisma';
import { encrypt, decrypt } from './crypto';

export type AiProvider = 'gemini' | 'groq';
export const AI_PROVIDERS: AiProvider[] = ['gemini', 'groq'];

export function maskKey(key: string): string {
    if (key.length <= 8) return '••••';
    return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

export async function saveUserApiKey(userId: string, provider: AiProvider, plaintextKey: string) {
    const key = plaintextKey.trim();
    if (key.length < 10) throw new Error('API 키가 너무 짧습니다');
    const encryptedKey = encrypt(key);
    const maskedHint = maskKey(key);
    await prisma.userApiKey.upsert({
        where: { userId_provider: { userId, provider } },
        update: { encryptedKey, maskedHint, updatedAt: new Date() },
        create: { userId, provider, encryptedKey, maskedHint },
    });
    return { maskedHint };
}

export async function getUserApiKey(userId: string, provider: AiProvider): Promise<string | null> {
    const row = await prisma.userApiKey.findUnique({ where: { userId_provider: { userId, provider } } });
    if (!row) return null;
    try {
        const plain = decrypt(row.encryptedKey);
        prisma.userApiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
        return plain;
    } catch {
        return null;
    }
}

export async function listUserApiKeys(userId: string) {
    return prisma.userApiKey.findMany({
        where: { userId },
        select: { provider: true, maskedHint: true, lastUsedAt: true, updatedAt: true },
        orderBy: { provider: 'asc' },
    });
}

export async function deleteUserApiKey(userId: string, provider: AiProvider): Promise<boolean> {
    try {
        await prisma.userApiKey.delete({ where: { userId_provider: { userId, provider } } });
        return true;
    } catch {
        return false;
    }
}

/** 사용 가능한 첫 AI provider 의 키를 반환 (gemini 우선, 없으면 groq). */
export async function resolveAiKey(userId: string): Promise<{ provider: AiProvider; key: string } | null> {
    for (const p of AI_PROVIDERS) {
        const key = await getUserApiKey(userId, p);
        if (key) return { provider: p, key };
    }
    return null;
}
