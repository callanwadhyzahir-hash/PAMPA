import { Module } from '@nestjs/common';

import { AiModule } from '../../ai/ai.module';
import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { ProductCategoriesModule } from '../../catalog/product-categories/product-categories.module';
import { ProductsModule } from '../../catalog/products/products.module';
import { StockModule } from '../stock/stock.module';
import { SmartImportController } from './smart-import.controller';
import { SmartImportService } from './smart-import.service';

/**
 * Carga inteligente de stock: the only ERP feature that calls
 * AiGatewayService.extractProducts. Everything else (duplicate detection,
 * product/variant/stock creation) reuses ProductsModule/StockModule's real
 * services — no parallel product-creation path, no direct Prisma access.
 */
@Module({
  imports: [
    AiModule,
    ProductsModule,
    ProductCategoriesModule,
    StockModule,
    SecurityAuditModule,
  ],
  controllers: [SmartImportController],
  providers: [SmartImportService],
})
export class SmartImportModule {}
