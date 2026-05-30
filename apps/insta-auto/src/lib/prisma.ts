/**
 * Prisma client — 공유 @amakers/db 재export.
 *
 * 클라이언트/스키마는 packages/db (전 봇 단일 source of truth)로 통합됨.
 * insta-auto 는 더 이상 자체 schema/클라이언트를 두지 않는다.
 */

export { prisma } from '@amakers/db';
