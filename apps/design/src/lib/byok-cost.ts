/**
 * BYOK credit 차감 헬퍼.
 *
 * 사용자가 해당 action 의 프로바이더에 대해 BYOK 키를 입력했다면 → 0 credits.
 * 미입력 시 → 운영자 키 사용 + 정상 credit 차감.
 *
 * Action → Provider 매핑:
 *   - OCR        → openai     (GPT-4 Vision)
 *   - INPAINT    → replicate  (FLUX Fill)
 *   - TRANSLATE  → anthropic  (Claude Opus)
 *   - ANALYZE    → anthropic
 *   - OUTLINE    → anthropic  (CREDIT_RATES 에는 OUTLINE 항목 없으므로 IMAGE_GEN 단가 사용 중)
 *   - IMAGE_GEN  → replicate  (FLUX Pro for new images)
 *   - COMPOSE    → null       (Sharp local — BYOK 영향 X, 항상 차감)
 *   - PUBLISH_*  → null
 */

import type { Provider } from './api-keys';
import { getUserApiKey, getUserByokStatus } from './api-keys';

export type ActionKind =
    | 'OCR'
    | 'INPAINT'
    | 'TRANSLATE'
    | 'ANALYZE'
    | 'OUTLINE'
    | 'IMAGE_GEN'  // 신규 이미지 생성 (Phase 3.2 섹션 이미지)
    | 'COMPOSE'    // 합성 (Sharp only)
    | 'PUBLISH_CLOUD'
    | 'PUBLISH_AGENT';

const ACTION_TO_PROVIDER: Record<ActionKind, Provider | null> = {
    OCR:           'openai',
    INPAINT:       'replicate',
    TRANSLATE:     'anthropic',
    ANALYZE:       'anthropic',
    OUTLINE:       'anthropic',
    IMAGE_GEN:     'replicate',
    COMPOSE:       null,
    PUBLISH_CLOUD: null,
    PUBLISH_AGENT: null,
};

/** 해당 action 이 BYOK 가능한지 (외부 AI 프로바이더를 사용하는지). */
export function actionUsesProvider(action: ActionKind): Provider | null {
    return ACTION_TO_PROVIDER[action];
}

/**
 * 사용자가 특정 action 에 대해 BYOK 키를 가지고 있는지 + 키 자체 반환.
 *
 * @returns { byok: boolean, userKey: string | null }
 *          byok=true 면 credit 차감 0, 호출 시 userKey 사용.
 */
export async function resolveByokForAction(
    userId: string,
    action: ActionKind,
): Promise<{ byok: boolean; userKey: string | null; provider: Provider | null }> {
    const provider = actionUsesProvider(action);
    if (!provider) return { byok: false, userKey: null, provider: null };

    const userKey = await getUserApiKey(userId, provider);
    return { byok: !!userKey, userKey, provider };
}

/**
 * BYOK 적용 후 실제 차감할 credit 계산.
 * 단순 — BYOK 면 0, 아니면 baseCost.
 *
 * 향후 platform fee (BYOK 모드에도 일부 차감) 적용하려면 여기 수정.
 */
export function computeByokAdjustedCost(baseCost: number, byok: boolean): number {
    return byok ? 0 : baseCost;
}

export { getUserByokStatus };
