import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { StockModule } from '../../inventory/stock/stock.module';
import { SaleRepository } from './repositories/sale.repository';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [SecurityAuditModule, StockModule],
  controllers: [SalesController],
  providers: [SalesService, SaleRepository],
  exports: [SalesService, SaleRepository],
})
export class SalesModule {}
