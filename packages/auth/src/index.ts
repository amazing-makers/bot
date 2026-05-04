/**
 * @amakers/auth
 *
 * 공통 NextAuth 헬퍼. 각 앱은 자체 auth.ts 를 가지되, 이 패키지에서 공통 로직을 가져다 씀.
 */

export { isAdminEmail, requireAdmin } from './admin-guard';
