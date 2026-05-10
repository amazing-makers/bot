/**
 * BYOK (Bring Your Own Key) — 사용자 외부 AI 프로바이더 API 키 저장/조회.
 *
 * 보안:
 *   - 저장 시 AES-256-GCM 암호화 (key = process.env.API_KEY_ENCRYPTION_SECRET, 32 bytes hex)
 *   - 조회 시 복호화. plaintext 는 메모리에만 짧게 보관, DB 에는 절대 저장 X.
 *   - DB column 형식: `iv(hex):ciphertext(hex):authTag(hex)`.
 *
 * Provider:
 *   - openai     → GPT-4 Vision OCR, DALL-E 등
 *   - anthropic  → Claude Opus (번역, 분석, outline)
 *   - replicate  → FLUX 1.1 Pro Fill (인페인팅), FLUX 1.1 Pro (신규 이미지)
 *
 * 호출 패턴:
 *   const apiKey = await getUserApiKey(userId, 'openai');
 *   if (apiKey) { ... 사용자 키 사용 ... } else { ... 운영자 키 + credit 차감 ... }
 */

import crypto from 'crypto';
import { prisma } from './prisma';

export type Provider = 'openai' | 'anthropic' | 'replicate';

export const ALL_PROVIDERS: Provider[] = ['openai', 'anthropic', 'replicate'];

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
    const hex = process.env.API_KEY_ENCRYPTION_SECRET;
    if (!hex) {
        throw new Error(
            'API_KEY_ENCRYPTION_SECRET 환경변수가 없습니다 — `openssl rand -hex 32` 로 생성 후 .env 에 추가하세요',
        );
    }
    const key = Buffer.from(hex, 'hex');
    if (key.length !== KEY_LENGTH) {
        throw new Error(`API_KEY_ENCRYPTION_SECRET 는 ${KEY_LENGTH * 2} 글자 hex 여야 합니다 (현재: ${hex.length})`);
    }
    return key;
}

function encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, getEncryptionKey(), iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

function decrypt(stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) throw new Error('암호화 데이터 형식 오류');
    const [ivHex, ctHex, tagHex] = parts;
    const decipher = crypto.createDecipheriv(ALGO, getEncryptionKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const dec = Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]);
    return dec.toString('utf8');
}

/** 키 끝 4글자만 보여주는 마스킹 (UI 표시용 — 어떤 키 입력했는지 확인). */
export function maskKey(key: string): string {
    if (key.length <= 8) return '••••';
    return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/**
 * 사용자가 입력한 키 저장 (또는 갱신).
 * 같은 (userId, provider) 가 이미 있으면 덮어씀.
 */
export async function saveUserApiKey(
    userId: string,
    provider: Provider,
    plaintextKey: string,
): Promise<{ id: string; maskedHint: string }> {
    if (!plaintextKey || plaintextKey.length < 10) {
        throw new Error('API 키가 너무 짧습니다 (10자 이상)');
    }

    const encryptedKey = encrypt(plaintextKey.trim());
    const maskedHint = maskKey(plaintextKey.trim());

    const existing = await (prisma as any).userApiKey.findUnique({
        where: { userId_provider: { userId, provider } },
    });

    if (existing) {
        const updated = await (prisma as any).userApiKey.update({
            where: { id: existing.id },
            data: { encryptedKey, maskedHint, updatedAt: new Date() },
        });
        return { id: updated.id, maskedHint };
    }

    const created = await (prisma as any).userApiKey.create({
        data: { userId, provider, encryptedKey, maskedHint },
    });
    return { id: created.id, maskedHint };
}

/**
 * 사용자의 키 조회 (복호화). 없으면 null.
 * lastUsedAt 도 같이 업데이트 (1시간 이상 지난 경우만 — 매 호출 update 방지).
 */
export async function getUserApiKey(
    userId: string,
    provider: Provider,
): Promise<string | null> {
    const row = await (prisma as any).userApiKey.findUnique({
        where: { userId_provider: { userId, provider } },
    });
    if (!row) return null;
    try {
        const plaintext = decrypt(row.encryptedKey);
        const lastUsed = row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : 0;
        if (Date.now() - lastUsed > 3600_000) {
            (prisma as any).userApiKey.update({
                where: { id: row.id },
                data: { lastUsedAt: new Date() },
            }).catch(() => {});
        }
        return plaintext;
    } catch (e) {
        console.error('[api-keys] 복호화 실패', e);
        return null;
    }
}

/**
 * 여러 provider 의 키를 한 번의 DB 쿼리로 조회 — process route 처럼 3개 동시 필요한 경우.
 * 결과: provider → plaintext key (없으면 entry 없음).
 */
export async function getUserApiKeysBulk(
    userId: string,
    providers: Provider[],
): Promise<Partial<Record<Provider, string>>> {
    if (providers.length === 0) return {};
    const rows = await (prisma as any).userApiKey.findMany({
        where: { userId, provider: { in: providers } },
    });
    const out: Partial<Record<Provider, string>> = {};
    const stale: string[] = [];
    for (const row of rows) {
        try {
            out[row.provider as Provider] = decrypt(row.encryptedKey);
            const lastUsed = row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : 0;
            if (Date.now() - lastUsed > 3600_000) stale.push(row.id);
        } catch (e) {
            console.error('[api-keys] bulk 복호화 실패', row.provider, e);
        }
    }
    if (stale.length > 0) {
        (prisma as any).userApiKey.updateMany({
            where: { id: { in: stale } },
            data: { lastUsedAt: new Date() },
        }).catch(() => {});
    }
    return out;
}

/** 사용자의 BYOK 상태 한 번에 조회 (UI 표시 + credit 차감 분기용). */
export async function getUserByokStatus(userId: string): Promise<Record<Provider, boolean>> {
    const rows = await (prisma as any).userApiKey.findMany({
        where: { userId },
        select: { provider: true },
    });
    const status: Record<Provider, boolean> = { openai: false, anthropic: false, replicate: false };
    for (const r of rows) {
        if ((ALL_PROVIDERS as string[]).includes(r.provider)) {
            status[r.provider as Provider] = true;
        }
    }
    return status;
}

/** 사용자의 키 목록 (UI 용 — encryptedKey 는 반환 X, maskedHint 만). */
export async function listUserApiKeys(userId: string) {
    return (prisma as any).userApiKey.findMany({
        where: { userId },
        select: {
            id: true,
            provider: true,
            maskedHint: true,
            lastUsedAt: true,
            createdAt: true,
            updatedAt: true,
        },
        orderBy: { provider: 'asc' },
    });
}

/** 키 삭제. */
export async function deleteUserApiKey(userId: string, provider: Provider): Promise<boolean> {
    try {
        await (prisma as any).userApiKey.delete({
            where: { userId_provider: { userId, provider } },
        });
        return true;
    } catch {
        return false;
    }
}
