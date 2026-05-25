'use server';

import { auth } from '@/auth';
import { rotateAgentToken } from '@/lib/agent-token';

async function requireUserId(): Promise<string> {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error('로그인이 필요합니다');
    return userId;
}

export async function rotateAgentTokenAction() {
    const userId = await requireUserId();
    const token = await rotateAgentToken(userId);
    return { ok: true as const, token };
}
