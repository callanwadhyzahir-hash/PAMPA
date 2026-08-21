import type { SecurityContext } from '../../auth/types/security-context';
import type { AiToolInputSchema } from '../provider/ai-tool.interface';

/**
 * A tool PAMPA IA can call. `handler` receives sanitized arguments (never
 * company_id/user_id — see AiToolRegistry.SENSITIVE_ARG_KEYS and
 * AiGatewayService.executeToolCall) and the real, authenticated
 * SecurityContext. It must return a minimal, JSON-serializable object — see
 * docs/pampa-ai-architecture.md §Contexto.
 *
 * `readOnly: true` is required on every tool this sprint (PAMPA IA cannot
 * mutate the ERP yet) — AiToolRegistry.register() refuses anything else.
 */
export interface AiTool<TArgs = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: AiToolInputSchema;
  /** An existing RBAC permission code (see rbac.definitions.ts) — never invented ad hoc for AI. */
  permission: string;
  readOnly: true;
  /** Defaults to AiConfigService.toolTimeoutMs when omitted. */
  timeoutMs?: number;
  handler: (args: TArgs, context: SecurityContext) => Promise<unknown>;
}
