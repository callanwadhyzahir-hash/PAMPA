export const AI_PLAN_CODES = [
  'AI_FREE',
  'AI_PRO',
  'AI_BUSINESS',
  'CUSTOM',
] as const;
export type AiPlanCode = (typeof AI_PLAN_CODES)[number];

export interface AiPlanPreset {
  monthlyCreditLimit: number;
  internalCostLimitUsd: string;
}

/**
 * Default commercial + fuse limits applied when Platform Admin sets a
 * company's plan_code to anything other than CUSTOM. CUSTOM always requires
 * Platform Admin to pass explicit monthlyCreditLimit/internalCostLimitUsd —
 * no v1 billing exists yet, these are placeholders to size the infra.
 */
export const AI_PLAN_PRESETS: Record<AiPlanCode, AiPlanPreset> = {
  AI_FREE: { monthlyCreditLimit: 2000, internalCostLimitUsd: '5.00' },
  AI_PRO: { monthlyCreditLimit: 10000, internalCostLimitUsd: '25.00' },
  AI_BUSINESS: { monthlyCreditLimit: 50000, internalCostLimitUsd: '100.00' },
  CUSTOM: { monthlyCreditLimit: 0, internalCostLimitUsd: '0' },
};

export function isAiPlanCode(value: string): value is AiPlanCode {
  return (AI_PLAN_CODES as readonly string[]).includes(value);
}
