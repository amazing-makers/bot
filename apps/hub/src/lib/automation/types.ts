/**
 * 자동화 엔진 타입. 어떤 자동화든 type(핸들러 키) + config(JSON)로 표현된다.
 * 새 자동화 추가 = 핸들러 하나 등록(handlers.ts). 엔진/스케줄/로그는 공용.
 */

export interface AutomationRecord {
  id: string;
  userId: string;
  name: string;
  type: string;
  status: string;
  scheduleKind: string;
  intervalMinutes: number | null;
  cronExpr: string | null;
  config: any;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  runCount: number;
}

export interface RunResult {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  summary?: string;
  error?: string;
  /** config 에 병합 저장할 부분(예: uploaded 소스 cursor 전진). */
  configPatch?: Record<string, any>;
}

export interface AutomationContext {
  userId: string;
  automation: AutomationRecord;
}

export type AutomationHandler = (ctx: AutomationContext) => Promise<RunResult>;

/** 자동화 타입 메타 — UI/AI 가 어떤 자동화를 만들 수 있는지 안다. */
export interface AutomationTypeMeta {
  type: string;
  label: string;
  description: string;
}

// ── scheduled_publish config 형태 ─────────────────────────
export type SourceKind = 'ai' | 'uploaded' | 'drive' | 'local';

export interface PublishSourceConfig {
  kind: SourceKind;
  // ai
  topic?: string;
  tone?: 'info' | 'guide' | 'review' | 'friendly';
  length?: 'short' | 'medium' | 'long';
  withImage?: boolean;
  imagePrompt?: string;
  // uploaded
  items?: Array<{ imageUrl?: string; title?: string; body?: string; caption?: string }>;
  cursor?: number;
}

export interface ScheduledPublishConfig {
  source: PublishSourceConfig;
  channels: { instaIds?: string[]; blogIds?: string[]; tistoryIds?: string[] };
}
