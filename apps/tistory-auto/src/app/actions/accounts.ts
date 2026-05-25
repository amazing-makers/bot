'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectTistory, deleteAccount } from '@/lib/tistory-account';

async function requireUserId(): Promise<string> {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error('로그인이 필요합니다');
    return userId;
}

export async function connectTistoryAction(formData: FormData) {
    const userId = await requireUserId();
    const siteUrl = String(formData.get('siteUrl') || '').trim();
    const username = String(formData.get('username') || '').trim();
    if (!siteUrl) {
        return { ok: false as const, error: '블로그 주소를 입력하세요 (예: myblog.tistory.com)' };
    }
    const result = await connectTistory(userId, siteUrl, username);
    if (result.ok) revalidatePath('/dashboard/accounts');
    return result;
}

export async function deleteAccountAction(accountId: string) {
    const userId = await requireUserId();
    const ok = await deleteAccount(userId, accountId);
    if (ok) revalidatePath('/dashboard/accounts');
    return { ok };
}
