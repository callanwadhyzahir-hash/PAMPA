import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/storefront/catalog.module';
import { StorefrontRepository } from './repositories/storefront.repository';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [AuthModule, CatalogModule],
  controllers: [StorefrontController],
  providers: [StorefrontService, StorefrontRepository],
})
export class StorefrontModule {}
