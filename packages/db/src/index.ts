/**
 * @amakers/db — 통합 공유 Prisma 클라이언트 + 타입.
 *
 * 사용법:
 *   import { prisma } from '@amakers/db';
 *   import type { User, InstagramPost } from '@amakers/db';
 *
 * 스키마는 packages/db/prisma/schema.prisma (전 봇 단일 source of truth).
 */

export { prisma } from './client';
export * from './generated/client';
