import { HttpException, HttpStatus } from '@nestjs/common';

/** Invalid/missing MERCADOLIBRE_* configuration. Thrown eagerly at module init (encryption key) or lazily at call time (client credentials). */
export class MercadoLibreConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MercadoLibreConfigurationError';
  }
}

/**
 * Base for every Mercado Libre domain error surfaced over HTTP. Carries a
 * machine-readable `code` alongside the human message so the frontend can
 * branch on it without parsing strings.
 */
export class MercadoLibreDomainError extends HttpException {
  constructor(code: string, message: string, status: HttpStatus) {
    super({ code, message }, status);
  }
}

export class MercadoLibreNotConfiguredError extends MercadoLibreDomainError {
  constructor() {
    super(
      'MERCADOLIBRE_NOT_CONFIGURED',
      'Mercado Libre todavía no fue configurado para esta instalación.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class MercadoLibreNotConnectedError extends MercadoLibreDomainError {
  constructor() {
    super(
      'MERCADOLIBRE_NOT_CONNECTED',
      'No hay una cuenta de Mercado Libre conectada.',
      HttpStatus.CONFLICT,
    );
  }
}

export class MercadoLibreAuthFailedError extends MercadoLibreDomainError {
  constructor(message = 'No se pudo completar la autorización con Mercado Libre.') {
    super('MERCADOLIBRE_AUTH_FAILED', message, HttpStatus.BAD_REQUEST);
  }
}

export class MercadoLibreTokenRefreshFailedError extends MercadoLibreDomainError {
  constructor() {
    super(
      'MERCADOLIBRE_TOKEN_REFRESH_FAILED',
      'No se pudo renovar el acceso a Mercado Libre. Reconectá la cuenta.',
      HttpStatus.BAD_GATEWAY,
    );
  }
}

export class MercadoLibreApiError extends MercadoLibreDomainError {
  constructor(message = 'Mercado Libre no respondió correctamente.') {
    super('MERCADOLIBRE_API_ERROR', message, HttpStatus.BAD_GATEWAY);
  }
}

export class MercadoLibreRateLimitedError extends MercadoLibreDomainError {
  constructor() {
    super(
      'MERCADOLIBRE_RATE_LIMITED',
      'Mercado Libre está limitando las solicitudes. Intentá nuevamente en unos minutos.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class MercadoLibreAccountAlreadyLinkedError extends MercadoLibreDomainError {
  constructor() {
    super(
      'MERCADOLIBRE_ACCOUNT_ALREADY_LINKED',
      'Esta cuenta de Mercado Libre ya está conectada a otra empresa en PAMPA. Desconectala ahí primero, o iniciá sesión en Mercado Libre con una cuenta distinta antes de conectar.',
      HttpStatus.CONFLICT,
    );
  }
}

export class MercadoLibreLinkConflictError extends MercadoLibreDomainError {
  constructor() {
    super(
      'MERCADOLIBRE_LINK_CONFLICT',
      'La publicación ya está vinculada a otro producto. Desvinculala primero.',
      HttpStatus.CONFLICT,
    );
  }
}
