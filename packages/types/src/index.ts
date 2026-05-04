/**
 * @amakers/types — 봇 간 공통 타입
 */

// ─── 봇 레지스트리 ─────────────────────────────────────────
export type BotKind = 'marketing' | 'design' | 'mockup';

export interface BotMeta {
    kind: BotKind;
    title: string;
    description: string;
    domain: string;             // 예: 'marketing.amakers.co.kr'
    appPath: string;            // 예: 'apps/marketing'
    enabled: boolean;
    pricingTiers?: PricingTier[];
}

export interface PricingTier {
    name: string;
    monthlyPriceKrw: number;
    features: string[];
    limits: Record<string, number>;
}

// ─── 사용량 (admin 대시보드용 공통 측정 단위) ──────────────
export interface BotUsageRecord {
    userId: string;
    bot: BotKind;
    yearMonth: string;          // "2026-05"
    units: number;              // 봇별 의미: marketing=발행수, design=내보내기수
    revenueKrw: number;
}

// ─── 리셀러 / 추천 ─────────────────────────────────────────
export interface ResellerSummary {
    id: string;
    name: string;
    contactEmail: string;
    referralCount: number;
    lifetimeRevenueKrw: number;
    pendingCommissionKrw: number;
    paidCommissionKrw: number;
    status: 'ACTIVE' | 'SUSPENDED';
}

export interface CommissionRow {
    id: string;
    referredUserId: string;
    referredUserEmail?: string;
    periodYearMonth: string;
    baseRevenue: number;
    commissionRate: number;
    amount: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED';
    paidAt?: string | null;
}
