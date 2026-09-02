import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';
import { ProductCategoryRepository } from './repositories/product-category.repository';

@Module({
  imports: [SecurityAuditModule],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService, ProductCategoryRepository],
  exports: [ProductCategoriesService],
})
export class ProductCategoriesModule {}
