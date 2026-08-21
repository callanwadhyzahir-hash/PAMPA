import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

/**
 * Multer's own limits (file size) throw a MulterError *outside* the
 * HttpException hierarchy, so the app's global HttpExceptionFilter (see
 * common/filters/http-exception.filter.ts) would otherwise render it as a
 * generic 500. This maps it to the same {success,statusCode,message} shape,
 * scoped to the image upload route only.
 */
@Catch(MulterError)
export class ProductImageUploadExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<{ url: string }>();

    const [status, message] =
      exception.code === 'LIMIT_FILE_SIZE'
        ? ([
            HttpStatus.PAYLOAD_TOO_LARGE,
            'La imagen supera el tamaño máximo permitido (5 MB).',
          ] as const)
        : ([
            HttpStatus.BAD_REQUEST,
            'No se pudo procesar el archivo enviado.',
          ] as const);

    response.status(status).json({
      success: false,
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
