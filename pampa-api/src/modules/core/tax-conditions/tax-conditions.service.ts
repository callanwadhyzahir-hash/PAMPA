import { Injectable } from '@nestjs/common';

import { TaxConditionRepository } from './repositories/tax-condition.repository';

@Injectable()
export class TaxConditionsService {
  constructor(
    private readonly taxConditionRepository: TaxConditionRepository,
  ) {}

  findAll() {
    return this.taxConditionRepository.findAll();
  }
}
