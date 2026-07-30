import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { SecurityContext } from '../../auth/types/security-context';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyRepository } from './repositories/company.repository';

@Injectable()
export class CompaniesService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async findCurrent(securityContext: SecurityContext) {
    const company = await this.companyRepository.findCurrent(
      securityContext.companyId,
    );

    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    return company;
  }

  private async validateRelations(dto: UpdateCompanyDto) {
    if (dto.companyTypeId) {
      const companyType = await this.companyRepository.findCompanyTypeById(
        dto.companyTypeId,
      );

      if (!companyType) {
        throw new NotFoundException('Tipo de empresa no encontrado.');
      }
    }

    if (dto.taxConditionId) {
      const taxCondition = await this.companyRepository.findTaxConditionById(
        dto.taxConditionId,
      );

      if (!taxCondition) {
        throw new NotFoundException('Condicion fiscal no encontrada.');
      }
    }

    if (dto.currencyId) {
      const currency = await this.companyRepository.findCurrencyById(
        dto.currencyId,
      );

      if (!currency) {
        throw new NotFoundException('Moneda no encontrada.');
      }
    }
  }

  async updateCurrent(
    securityContext: SecurityContext,
    updateCompanyDto: UpdateCompanyDto,
  ) {
    await this.validateRelations(updateCompanyDto);

    if (updateCompanyDto.taxId) {
      const companyByTaxId =
        await this.companyRepository.findByTaxIdExcludingId(
          updateCompanyDto.taxId,
          securityContext.companyId,
        );

      if (companyByTaxId) {
        throw new ConflictException('Ya existe una empresa con ese CUIT.');
      }
    }

    const company = await this.companyRepository.updateCurrent(
      securityContext.companyId,
      updateCompanyDto,
    );

    if (!company) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    return company;
  }
}
