import { Injectable } from '@nestjs/common';

import { CompanyTypeRepository } from './repositories/company-type.repository';

@Injectable()
export class CompanyTypesService {
  constructor(private readonly companyTypeRepository: CompanyTypeRepository) {}

  findAll() {
    return this.companyTypeRepository.findAll();
  }
}
