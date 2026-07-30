import { Module } from '@nestjs/common';
import { CurrenciesController } from './currencies.controller';
import { CurrencyRepository } from './repositories/currency.repository';
import { CurrenciesService } from './currencies.service';

@Module({
  controllers: [CurrenciesController],
  providers: [CurrenciesService, CurrencyRepository],
})
export class CurrenciesModule {}
