import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { ProductsController } from './products.controller';
import { ProductRepository } from './repositories/product.repository';
import { ProductsService } from './products.service';

@Module({
  imports: [SecurityAuditModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductRepository],
})
export class ProductsModule {}
