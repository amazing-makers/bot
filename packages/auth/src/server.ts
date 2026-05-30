/**
 * @amakers/auth/server — NextAuth 인스턴스 조립 (Node 런타임).
 *
 * 각 앱의 src/auth.ts 는 한 줄로:
 *   export const { handlers, auth, signIn, signOut } = createAuth();
 *
 * admin 처럼 추가 게이트가 필요하면 providers 를 직접 구성하거나 콜백을 확장.
 */

import NextAuth from 'next-auth';
import { buildAuthConfig, type BuildAuthConfigOptions } from './config';
import { createCredentialsProvider } from './credentials';

export function createAuth(opts: BuildAuthConfigOptions = {}) {
  return NextAuth({
    ...buildAuthConfig(opts),
    providers: [createCredentialsProvider()],
  });
}

export { createCredentialsProvider } from './credentials';
export { buildAuthConfig } from './config';
export type { BuildAuthConfigOptions } from './config';
