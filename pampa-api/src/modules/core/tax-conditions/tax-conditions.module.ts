import { Module } from '@nestjs/common';

import { TaxConditionsController } from './tax-conditions.controller';
import { TaxConditionsService } from './tax-conditions.service';
import { TaxConditionRepository } from './repositories/tax-condition.repository';

@Module({
  controllers: [TaxConditionsController],
  providers: [TaxConditionsService, TaxConditionRepository],
})
export class TaxConditionsModule {}
