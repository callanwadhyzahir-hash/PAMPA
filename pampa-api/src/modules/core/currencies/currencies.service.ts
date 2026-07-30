import { Injectable } from '@nestjs/common';

import { CurrencyRepository } from './repositories/currency.repository';

@Injectable()
export class CurrenciesService {
  constructor(private readonly currencyRepository: CurrencyRepository) {}

  findAll() {
    return this.currencyRepository.findAll();
  }
}
