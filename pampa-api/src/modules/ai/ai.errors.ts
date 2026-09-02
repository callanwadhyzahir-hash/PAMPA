import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base for every PAMPA IA domain error surfaced over HTTP. Carries a
 * machine-readable `code` alongside the human message so the frontend can
 * branch on it without parsing strings — mirrors MercadoLibreDomainError.
 */
export class AiDomainError extends HttpException {
  constructor(code: string, message: string, status: HttpStatus) {
    super({ code, message }, status);
  }
}

export class AiDisabledError extends AiDomainError {
  constructor() {
    super(
      'AI_DISABLED',
      'PAMPA IA no está habilitada para esta empresa.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

const QUOTA_MESSAGE =
  'Alcanzaste el límite mensual de PAMPA IA. El resto de PAMPA continúa funcionando normalmente.';

export class AiQuotaExceededError extends AiDomainError {
  constructor() {
    super('AI_QUOTA_EXCEEDED', QUOTA_MESSAGE, HttpStatus.PAYMENT_REQUIRED);
  }
}

/**
 * Internal cost fuse tripped (see company_ai_subscription.internal_cost_limit_usd).
 * Message is deliberately identical to AI_QUOTA_EXCEEDED — the client must
 * never learn that a second, hidden limit exists. The distinct `code` is
 * for internal handling and Platform Admin's activity feed only.
 */
export class AiCostLimitExceededError extends AiDomainError {
  constructor() {
    super('AI_COST_LIMIT_EXCEEDED', QUOTA_MESSAGE, HttpStatus.PAYMENT_REQUIRED);
  }
}

export class AiRateLimitedError extends AiDomainError {
  constructor() {
    super(
      'AI_RATE_LIMITED',
      'Estás realizando demasiadas consultas a PAMPA IA. Esperá unos instantes.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class AiProviderNotConfiguredError extends AiDomainError {
  constructor() {
    super(
      'AI_PROVIDER_NOT_CONFIGURED',
      'PAMPA IA todavía no fue configurada para esta instalación.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class AiProviderError extends AiDomainError {
  constructor() {
    super(
      'AI_PROVIDER_ERROR',
      'PAMPA IA no pudo procesar tu consulta. Intentá nuevamente en unos minutos.',
      HttpStatus.BAD_GATEWAY,
    );
  }
}

/** The provider responded successfully but the content wasn't the structured JSON an extraction call required (malformed JSON, wrong shape, empty result). Distinct from AiProviderError — the request reached the provider and got billed. */
export class AiInvalidResponseError extends AiDomainError {
  constructor() {
    super(
      'AI_INVALID_RESPONSE',
      'PAMPA IA no pudo interpretar la información. Probá con un texto o una imagen más clara.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
