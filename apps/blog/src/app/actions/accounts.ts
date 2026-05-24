'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { connectWordPress, deleteAccount } from '@/lib/blog-account';

async function requireUserId(): Promise<string> {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) throw new Error('로그인이 필요합니다');
    return userId;
}

export async function connectWordPressAction(formData: FormData) {
    const userId = await requireUserId();
    const siteUrl = String(formData.get('siteUrl') || '').trim();
    const username = String(formData.get('username') || '').trim();
    const appPassword = String(formData.get('appPassword') || '').trim();
    if (!siteUrl || !username || !appPassword) {
        return { ok: false as const, error: 'siteUrl · username · appPassword 를 모두 입력하세요' };
    }
    const result = await connectWordPress(userId, siteUrl, username, appPassword);
    if (result.ok) revalidatePath('/dashboard/accounts');
    return result;
}

export async function deleteAccountAction(accountId: string) {
    const userId = await requireUserId();
    const ok = await deleteAccount(userId, accountId);
    if (ok) revalidatePath('/dashboard/accounts');
    return { ok };
}
