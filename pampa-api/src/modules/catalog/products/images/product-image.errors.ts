import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base for every product-image domain error surfaced over HTTP. Carries a
 * machine-readable `code` alongside the human message — mirrors AiDomainError
 * (see ../../ai/ai.errors.ts). Distinct HTTP statuses per case let the
 * frontend branch without needing `code` to survive the global exception
 * filter (see common/filters/http-exception.filter.ts, which only forwards
 * `message`).
 */
export class ProductImageDomainError extends HttpException {
  constructor(code: string, message: string, status: HttpStatus) {
    super({ code, message }, status);
  }
}

export class ProductImageStorageNotConfiguredError extends ProductImageDomainError {
  constructor() {
    super(
      'IMAGE_STORAGE_NOT_CONFIGURED',
      'La subida de imágenes de producto todavía no fue configurada para esta instalación.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export class ProductImageInvalidTypeError extends ProductImageDomainError {
  constructor() {
    super(
      'IMAGE_INVALID_TYPE',
      'Formato de imagen no soportado. Usá JPG, PNG o WebP.',
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  }
}

export class ProductImageTooLargeError extends ProductImageDomainError {
  constructor() {
    super(
      'IMAGE_TOO_LARGE',
      'La imagen supera el tamaño máximo permitido (5 MB).',
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}

export class ProductImageDecodeError extends ProductImageDomainError {
  constructor() {
    super(
      'IMAGE_DECODE_FAILED',
      'No se pudo procesar el archivo. Verificá que sea una imagen válida.',
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ProductImageMissingFileError extends ProductImageDomainError {
  constructor() {
    super(
      'IMAGE_FILE_REQUIRED',
      'Adjuntá un archivo de imagen.',
      HttpStatus.BAD_REQUEST,
    );
  }
}
