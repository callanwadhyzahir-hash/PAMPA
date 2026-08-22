import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { StockModule } from '../../inventory/stock/stock.module';
import { ClientsModule } from '../clients/clients.module';
import { SalesModule } from '../sales/sales.module';
import { CatalogOrdersController } from './catalog-orders.controller';
import { CatalogOrdersService } from './catalog-orders.service';
import { CatalogOrderRepository } from './repositories/catalog-order.repository';

@Module({
  imports: [SecurityAuditModule, StockModule, ClientsModule, SalesModule],
  controllers: [CatalogOrdersController],
  providers: [CatalogOrdersService, CatalogOrderRepository],
})
export class CatalogOrdersModule {}
