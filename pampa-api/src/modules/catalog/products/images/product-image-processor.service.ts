import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import {
  ProductImageDecodeError,
  ProductImageInvalidTypeError,
} from './product-image.errors';

/** Declared Content-Type is never trusted alone — sharp must also decode the
 * bytes below, which is what actually rejects a renamed/spoofed file. */
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

export interface ProcessedProductImage {
  buffer: Buffer;
  contentType: 'image/webp';
}

@Injectable()
export class ProductImageProcessorService {
  /**
   * Validates and normalizes an uploaded product image: rejects anything
   * sharp can't decode as a real raster image, then re-encodes it to WebP
   * capped at MAX_DIMENSION so no table/selector ever downloads a
   * multi-megabyte original just to render a thumbnail.
   */
  async process(file: {
    mimetype: string;
    buffer: Buffer;
  }): Promise<ProcessedProductImage> {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new ProductImageInvalidTypeError();
    }

    let buffer: Buffer;
    try {
      const image = sharp(file.buffer, { failOn: 'error' });
      const metadata = await image.metadata();
      if (!metadata.width || !metadata.height) {
        throw new ProductImageDecodeError();
      }
      buffer = await image
        .rotate() // normalize EXIF orientation before resizing
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (error) {
      if (error instanceof ProductImageDecodeError) throw error;
      throw new ProductImageDecodeError();
    }

    return { buffer, contentType: 'image/webp' };
  }
}
