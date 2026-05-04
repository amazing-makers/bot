/**
 * @amakers/db
 *
 * 통합 Prisma 클라이언트. 현재는 marketingbot 의 schema 를 source-of-truth 로 사용.
 * marketingbot 이 apps/marketing 으로 이전된 후 schema 를 이쪽으로 옮길 예정.
 *
 * 임시 사용법:
 *   - admin 앱은 자체 prisma client (apps/admin/prisma) 를 사용
 *   - 추후 통합 시 이 파일에서 export
 */

export { PrismaClient } from '@prisma/client';

// 추후 추가 예정:
//   export { prisma } from './client';
//   export type * from './generated';
