/**
 * 네이버 데스크톱 에이전트 토큰 — 범용 UserWebhookToken 재사용(label='naver-agent').
 */
import crypto from 'crypto';
import { prisma } from './prisma';

const LABEL = 'naver-agent';
const gen = () => 'nvr_' + crypto.randomBytes(24).toString('hex');

export async function getOrCreateAgentToken(userId: string): Promise<string> {
  const existing = await prisma.userWebhookToken.findFirst({
    where: { userId, label: LABEL, enabled: true },
    orderBy: { createdAt: 'desc' },
    select: { token: true },
  });
  if (existing) return existing.token;
  const token = gen();
  await prisma.userWebhookToken.create({ data: { userId, label: LABEL, token, enabled: true } });
  return token;
}

export async function rotateAgentToken(userId: string): Promise<string> {
  await prisma.userWebhookToken.updateMany({ where: { userId, label: LABEL }, data: { enabled: false } });
  const token = gen();
  await prisma.userWebhookToken.create({ data: { userId, label: LABEL, token, enabled: true } });
  return token;
}

export async function resolveAgentToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const row = await prisma.userWebhookToken.findFirst({
    where: { token, label: LABEL, enabled: true },
    select: { id: true, userId: true },
  });
  if (!row) return null;
  prisma.userWebhookToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return row.userId;
}

export function bearerFromHeader(h: string | null): string | null {
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1] : null;
}
