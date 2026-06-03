/**
 * 데스크톱 에이전트 토큰 — 범용 UserWebhookToken 을 재사용(label='desktop-agent').
 * 새 테이블 없이 per-user 토큰 발급/검증.
 */

import crypto from 'crypto';
import { prisma } from '@amakers/db';

const LABEL = 'desktop-agent';

function genToken(): string {
  return 'dsk_' + crypto.randomBytes(24).toString('hex');
}

/** 사용자별 데스크톱 에이전트 토큰을 반환(없으면 생성). */
export async function getOrCreateDesktopToken(userId: string): Promise<string> {
  const existing = await prisma.userWebhookToken.findFirst({
    where: { userId, label: LABEL, enabled: true },
    orderBy: { createdAt: 'desc' },
    select: { token: true },
  });
  if (existing) return existing.token;
  const token = genToken();
  await prisma.userWebhookToken.create({ data: { userId, label: LABEL, token, enabled: true } });
  return token;
}

/** 토큰 재발급(기존 비활성화 후 새로 발급). */
export async function rotateDesktopToken(userId: string): Promise<string> {
  await prisma.userWebhookToken.updateMany({ where: { userId, label: LABEL }, data: { enabled: false } });
  const token = genToken();
  await prisma.userWebhookToken.create({ data: { userId, label: LABEL, token, enabled: true } });
  return token;
}

/** 토큰 → userId (유효하면). 사용시각 갱신. */
export async function resolveDesktopToken(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  const row = await prisma.userWebhookToken.findFirst({
    where: { token, label: LABEL, enabled: true },
    select: { id: true, userId: true },
  });
  if (!row) return null;
  prisma.userWebhookToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return row.userId;
}

export function bearerFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
  return m ? m[1] : null;
}
