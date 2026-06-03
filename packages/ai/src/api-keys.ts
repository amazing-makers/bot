/**
 * @amakers/ai — BYOK 사용자 외부 AI 키 저장/조회 (공유 UserApiKey, 전 봇 공용).
 *
 * 핵심: UserApiKey 는 @@unique([userId, provider]) — 앱이 아니라 사용자+provider 기준.
 *       허브에서 한 번 등록하면 인스타·블로그 등 모든 도구가 같은 키를 쓴다.
 *
 * provider:
 *   - gemini → Google AI (무료 티어, aistudio.google.com)
 *   - groq   → Groq (무료 티어, console.groq.com)
 *
 * 키는 암호화 저장, 복호화는 호출 시점에만. plaintext 는 DB·응답에 노출 X (maskedHint 만).
 */

import { prisma } from '@amakers/db';
import { encrypt, decrypt } from './crypto';

export type AiProvider = 'gemini' | 'groq';
export const AI_PROVIDERS: AiProvider[] = ['gemini', 'groq'];

export const PROVIDER_META: Record<AiProvider, { label: string; issueUrl: string; hint: string }> = {
  gemini: {
    label: 'Google Gemini',
    issueUrl: 'https://aistudio.google.com/app/apikey',
    hint: '무료 — Google 계정으로 즉시 발급',
  },
  groq: {
    label: 'Groq',
    issueUrl: 'https://console.groq.com/keys',
    hint: '무료 — 빠른 추론',
  },
};

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

/** 사용 가능한 첫 AI provider 의 키 반환 (gemini 우선, 없으면 groq). */
export async function resolveAiKey(userId: string): Promise<{ provider: AiProvider; key: string } | null> {
  for (const p of AI_PROVIDERS) {
    const key = await getUserApiKey(userId, p);
    if (key) return { provider: p, key };
  }
  return null;
}

/** 등록된 모든 provider 의 키(gemini, groq 순). 429/한도 초과 시 다음 provider 로 폴백하는 데 사용. */
export async function resolveAllAiKeys(userId: string): Promise<Array<{ provider: AiProvider; key: string }>> {
  const out: Array<{ provider: AiProvider; key: string }> = [];
  for (const p of AI_PROVIDERS) {
    const key = await getUserApiKey(userId, p);
    if (key) out.push({ provider: p, key });
  }
  return out;
}

/** 사용자가 AI 키를 하나라도 등록했는지 (허브 상태 칩·온보딩용). */
export async function hasAnyApiKey(userId: string): Promise<boolean> {
  const n = await prisma.userApiKey.count({ where: { userId } });
  return n > 0;
}
