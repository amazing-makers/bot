'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectAccount, deleteAccount } from '@/lib/instagram-account';

async function requireUserId(): Promise<string> {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error('로그인이 필요합니다');
    return userId;
}

export async function connectAccountAction(formData: FormData) {
    const userId = await requireUserId();
    const accessToken = String(formData.get('accessToken') || '').trim();
    const igUserId = String(formData.get('igUserId') || '').trim();
    if (!accessToken || !igUserId) {
        return { ok: false as const, error: 'accessToken 과 igUserId 를 모두 입력하세요' };
    }
    const result = await connectAccount(userId, accessToken, igUserId);
    if (result.ok) revalidatePath('/dashboard/accounts');
    return result;
}

export async function deleteAccountAction(accountId: string) {
    const userId = await requireUserId();
    const ok = await deleteAccount(userId, accountId);
    if (ok) revalidatePath('/dashboard/accounts');
    return { ok };
}
