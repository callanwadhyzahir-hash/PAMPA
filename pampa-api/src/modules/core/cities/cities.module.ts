import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { CityRepository } from './repositories/city.repository';

@Module({
  controllers: [CitiesController],
  providers: [CitiesService, CityRepository],
})
export class CitiesModule {}
