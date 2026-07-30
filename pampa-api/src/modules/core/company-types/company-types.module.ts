import { Module } from '@nestjs/common';

import { CompanyTypesController } from './company-types.controller';
import { CompanyTypesService } from './company-types.service';
import { CompanyTypeRepository } from './repositories/company-type.repository';

@Module({
  controllers: [CompanyTypesController],
  providers: [CompanyTypesService, CompanyTypeRepository],
})
export class CompanyTypesModule {}
