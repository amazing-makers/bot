/**
 * instaauto NextAuth — 공유 @amakers/auth 로 조립.
 *
 * SSO: 같은 User 테이블 + 같은 NEXTAUTH_SECRET + .amakers.co.kr 쿠키 →
 *      한 봇에서 로그인하면 모든 봇 자동 로그인. 설정은 packages/auth 한 곳.
 */

import { createAuth } from '@amakers/auth/server';

export const { handlers, auth, signIn, signOut } = createAuth();
