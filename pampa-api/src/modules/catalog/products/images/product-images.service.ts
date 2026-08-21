import { Injectable, NotFoundException } from '@nestjs/common';

import type { SecurityContext } from '../../../auth/types/security-context';
import { ProductRepository } from '../repositories/product.repository';
import { ProductImageMissingFileError } from './product-image.errors';
import { ProductImageProcessorService } from './product-image-processor.service';
import { ProductImageStorageService } from './product-image-storage.service';

export interface UploadedFile {
  mimetype: string;
  buffer: Buffer;
}

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly storage: ProductImageStorageService,
    private readonly processor: ProductImageProcessorService,
  ) {}

  async upload(
    context: SecurityContext,
    productId: string,
    file: UploadedFile | undefined,
  ): Promise<{ id: string; imageUrl: string }> {
    if (!file) throw new ProductImageMissingFileError();

    const existing = await this.repository.findImageMeta(
      context.companyId,
      productId,
    );
    if (!existing) throw new NotFoundException('Producto no encontrado.');

    const processed = await this.processor.process(file);
    const pathname = this.storage.buildPathname(context.companyId, productId);
    const uploaded = await this.storage.upload(
      pathname,
      processed.buffer,
      processed.contentType,
    );

    const updated = await this.repository.setImage(
      context.companyId,
      productId,
      {
        imageUrl: uploaded.url,
        imagePathname: uploaded.pathname,
      },
    );
    if (!updated) {
      // Product was deleted concurrently between the check above and here.
      await this.storage.delete(uploaded.pathname);
      throw new NotFoundException('Producto no encontrado.');
    }

    // Swap-then-clean: only remove the previous blob once the new one is
    // confirmed live in the DB, so a mid-flight failure never leaves the
    // product without a valid image.
    if (
      existing.image_pathname &&
      existing.image_pathname !== uploaded.pathname
    ) {
      await this.storage.delete(existing.image_pathname);
    }

    return { id: updated.id, imageUrl: updated.image_url! };
  }

  async remove(
    context: SecurityContext,
    productId: string,
  ): Promise<{ id: string; imageUrl: null }> {
    const existing = await this.repository.findImageMeta(
      context.companyId,
      productId,
    );
    if (!existing) throw new NotFoundException('Producto no encontrado.');

    if (!existing.image_pathname) {
      return { id: productId, imageUrl: null };
    }

    const cleared = await this.repository.clearImage(
      context.companyId,
      productId,
    );
    if (!cleared) throw new NotFoundException('Producto no encontrado.');

    await this.storage.delete(existing.image_pathname);
    return { id: productId, imageUrl: null };
  }
}
