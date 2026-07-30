import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { WarehouseRepository } from './repositories/warehouse.repository';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

@Module({
  imports: [SecurityAuditModule],
  controllers: [WarehousesController],
  providers: [WarehousesService, WarehouseRepository],
})
export class WarehousesModule {}
