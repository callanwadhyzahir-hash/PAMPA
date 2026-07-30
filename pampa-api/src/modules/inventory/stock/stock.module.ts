import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { StockRepository } from './repositories/stock.repository';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [SecurityAuditModule],
  controllers: [StockController],
  providers: [StockService, StockRepository],
  exports: [StockService, StockRepository],
})
export class StockModule {}
