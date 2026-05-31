/**
 * naverblogauto NextAuth — 공유 @amakers/auth 로 조립.
 * 같은 User 테이블 + 같은 NEXTAUTH_SECRET + .amakers.co.kr 쿠키 → 전 봇 SSO.
 */

import { createAuth } from '@amakers/auth/server';

export const { handlers, auth, signIn, signOut } = createAuth();
