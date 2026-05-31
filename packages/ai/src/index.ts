/**
 * @amakers/ai — 공유 BYOK (사용자 AI 키) + 암호화.
 *
 *   import { saveUserApiKey, resolveAiKey, hasAnyApiKey, validateApiKey } from '@amakers/ai';
 *   import { encrypt, decrypt } from '@amakers/ai';
 */

export { encrypt, decrypt } from './crypto';
export {
  type AiProvider,
  AI_PROVIDERS,
  PROVIDER_META,
  maskKey,
  saveUserApiKey,
  getUserApiKey,
  listUserApiKeys,
  deleteUserApiKey,
  resolveAiKey,
  hasAnyApiKey,
} from './api-keys';
export { validateApiKey, type ValidateResult } from './validate';

// AI 생성 (전 봇/허브 공용)
export { generateBlogPost, type WriterInput, type WriterResult, type BlogTone, type BlogLength } from './writer';
export { generateImage, buildPollinationsUrl, IMAGE_RATIOS, type ImageRatio, type GenerateImageResult } from './image';
export { stripMarkdown, deriveCaption } from './caption';
