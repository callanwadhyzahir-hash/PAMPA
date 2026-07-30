import { Injectable } from '@nestjs/common';

import { CityRepository } from './repositories/city.repository';

@Injectable()
export class CitiesService {
  constructor(private readonly repository: CityRepository) {}

  findAll() {
    return this.repository.findAllActive();
  }
}
