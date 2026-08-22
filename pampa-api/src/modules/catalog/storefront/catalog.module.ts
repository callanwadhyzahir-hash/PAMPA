import { Module } from '@nestjs/common';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogRepository } from './repositories/catalog.repository';

@Module({
  imports: [SecurityAuditModule],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogRepository],
  exports: [CatalogRepository],
})
export class CatalogModule {}
