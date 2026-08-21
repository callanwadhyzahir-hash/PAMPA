import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { del, put } from '@vercel/blob';

import { ProductImageStorageNotConfiguredError } from './product-image.errors';

export interface StoredProductImage {
  url: string;
  pathname: string;
}

/**
 * Thin wrapper around Vercel Blob. Never crashes boot when
 * BLOB_READ_WRITE_TOKEN is missing (same "optional per-install" pattern as
 * MercadoLibreConfigService) — callers get an explicit
 * IMAGE_STORAGE_NOT_CONFIGURED instead of a 500, and the rest of the ERP
 * keeps working.
 */
@Injectable()
export class ProductImageStorageService {
  private readonly token?: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('BLOB_READ_WRITE_TOKEN') || undefined;
  }

  get configured(): boolean {
    return Boolean(this.token);
  }

  buildPathname(companyId: string, productId: string): string {
    return `products/${companyId}/${productId}/${randomUUID()}.webp`;
  }

  async upload(
    pathname: string,
    body: Buffer,
    contentType: string,
  ): Promise<StoredProductImage> {
    if (!this.token) throw new ProductImageStorageNotConfiguredError();
    const blob = await put(pathname, body, {
      access: 'public',
      contentType,
      token: this.token,
      addRandomSuffix: false,
    });
    return { url: blob.url, pathname: blob.pathname };
  }

  /** Best-effort cleanup: an orphaned blob is a cost/tidiness issue, never a
   * reason to fail a request that already succeeded at the DB level. */
  async delete(pathname: string): Promise<void> {
    if (!this.token) return;
    try {
      await del(pathname, { token: this.token });
    } catch {
      // swallow — see doc comment above.
    }
  }
}
