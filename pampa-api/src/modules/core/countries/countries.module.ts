import { Module } from '@nestjs/common';

import { CountriesController } from './countries.controller';
import { CountriesService } from './countries.service';
import { CountryRepository } from './repositories/country.repository';

@Module({
  controllers: [CountriesController],
  providers: [CountriesService, CountryRepository],
})
export class CountriesModule {}
