/**
 * @amakers/auth — 공통 인증 (Edge-safe 진입점).
 *
 * - 권한 헬퍼: isAdminEmail / requireAdmin (순수 함수)
 * - Edge-safe 설정: buildAuthConfig (middleware 용)
 *
 * 자격증명 검증/NextAuth 인스턴스(Node, bcrypt+pg)는 `@amakers/auth/server` 에서:
 *   import { createAuth } from '@amakers/auth/server';
 */

export { isAdminEmail, requireAdmin } from './admin-guard';
export { buildAuthConfig } from './config';
export type { BuildAuthConfigOptions } from './config';
