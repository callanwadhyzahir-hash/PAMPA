export interface AiPriceEntry {
  provider: string;
  model: string;
  /** ISO date (YYYY-MM-DD). Entries are looked up by "latest entry with effectiveFrom <= now". */
  effectiveFrom: string;
  /** USD per 1,000,000 non-cached input tokens. */
  inputPerMillion: number;
  /** USD per 1,000,000 cached input tokens (prompt cache hits). */
  cachedInputPerMillion: number;
  /** USD per 1,000,000 output tokens. */
  outputPerMillion: number;
}

/**
 * Central pricing table for every provider/model PAMPA IA can call.
 *
 * SOURCE: https://openai.com/api/pricing/ — verificado 2026-08-17 contra la
 * documentación oficial de OpenAI para gpt-5-mini: input USD 0.25 / 1M
 * tokens, output USD 2.00 / 1M tokens, cached input USD 0.025 / 1M tokens
 * (10% del precio de input, el descuento estándar de OpenAI para prompt
 * caching). Estos valores NO son permanentes — OpenAI puede cambiarlos sin
 * aviso; volver a verificar contra la fuente oficial periódicamente.
 *
 * To update a price: append a NEW entry with a later `effectiveFrom`. Never
 * edit or delete a historical entry — AiPricingService picks the latest
 * entry effective at the time of the request, so old ledger rows keep
 * costing what they actually cost when recomputed, and the audit trail of
 * "what did we think prices were on date X" stays intact.
 */
export const AI_PRICING_TABLE: readonly AiPriceEntry[] = [
  {
    provider: 'openai',
    model: 'gpt-5-mini',
    effectiveFrom: '2025-08-01',
    inputPerMillion: 0.25,
    cachedInputPerMillion: 0.025,
    outputPerMillion: 2.0,
  },
];
