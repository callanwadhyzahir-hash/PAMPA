import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { ProductImageProcessorService } from './images/product-image-processor.service';
import { ProductImageStorageService } from './images/product-image-storage.service';
import { ProductImagesController } from './images/product-images.controller';
import { ProductImagesService } from './images/product-images.service';
import { ProductsController } from './products.controller';
import { ProductRepository } from './repositories/product.repository';
import { ProductsService } from './products.service';
import { ProductVariantsController } from './variants/product-variants.controller';
import { ProductVariantsService } from './variants/product-variants.service';
import { ProductVariantRepository } from './variants/repositories/product-variant.repository';

@Module({
  imports: [SecurityAuditModule],
  controllers: [
    ProductsController,
    ProductImagesController,
    ProductVariantsController,
  ],
  providers: [
    ProductsService,
    ProductRepository,
    ProductImagesService,
    ProductImageStorageService,
    ProductImageProcessorService,
    ProductVariantsService,
    ProductVariantRepository,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
