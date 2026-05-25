/**
 * 데스크톱 에이전트 인증 토큰.
 *
 * 사용자가 발급한 토큰을 에이전트 설정에 넣으면, 에이전트가 Bearer 로 /api/agent/* 를 호출.
 * 토큰 → userId 해석으로 해당 사용자의 발행 큐만 처리.
 */

import crypto from 'crypto';
import { prisma } from './prisma';

/** 사용자의 에이전트 토큰 조회(없으면 생성). */
export async function getOrCreateAgentToken(userId: string): Promise<string> {
    const existing = await prisma.tistoryAgentToken.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { token: true },
    });
    if (existing) return existing.token;

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.tistoryAgentToken.create({ data: { userId, token } });
    return token;
}

/** 새 토큰으로 회전(기존 폐기). */
export async function rotateAgentToken(userId: string): Promise<string> {
    await prisma.tistoryAgentToken.deleteMany({ where: { userId } });
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.tistoryAgentToken.create({ data: { userId, token } });
    return token;
}

/** Bearer 토큰 검증 → userId (없으면 null). lastUsedAt 갱신(throttle). */
export async function resolveAgentToken(token: string | null | undefined): Promise<string | null> {
    if (!token) return null;
    const row = await prisma.tistoryAgentToken.findUnique({
        where: { token },
        select: { id: true, userId: true, lastUsedAt: true },
    });
    if (!row) return null;
    const last = row.lastUsedAt ? row.lastUsedAt.getTime() : 0;
    if (Date.now() - last > 60_000) {
        prisma.tistoryAgentToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
    }
    return row.userId;
}

/** Authorization 헤더에서 Bearer 토큰 추출. */
export function bearerFromHeader(authHeader: string | null): string | null {
    if (!authHeader) return null;
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    return m ? m[1].trim() : null;
}
