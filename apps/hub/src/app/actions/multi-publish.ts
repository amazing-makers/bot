'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { publishForUser, type PublishToChannelsInput, type PublishResult } from '@/lib/publish-core';

export type { PublishToChannelsInput, PublishResult } from '@/lib/publish-core';

async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) throw new Error('로그인이 필요합니다');
  return userId;
}

/** 한 번 작성 → 선택한 인스타/블로그/티스토리 계정에 동시 발행(자동 적응). */
export async function publishToChannels(input: PublishToChannelsInput): Promise<PublishResult> {
  const userId = await requireUserId();
  const result = await publishForUser(userId, input);
  revalidatePath('/');
  return result;
}
