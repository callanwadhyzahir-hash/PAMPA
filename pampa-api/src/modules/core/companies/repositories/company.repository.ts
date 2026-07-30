import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import { UpdateCompanyDto } from '../dto/update-company.dto';

const companySelect = {
  id: true,
  company_type_id: true,
  tax_condition_id: true,
  currency_id: true,
  name: true,
  legal_name: true,
  tax_id: true,
  email: true,
  phone: true,
  website: true,
  logo_url: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.companySelect;

@Injectable()
export class CompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCurrent(companyId: string) {
    return this.prisma.company.findFirst({
      where: {
        id: companyId,
        is_active: true,
      },
      select: companySelect,
    });
  }

  findByTaxIdExcludingId(taxId: string, companyId: string) {
    return this.prisma.company.findFirst({
      where: {
        tax_id: taxId,
        NOT: {
          id: companyId,
        },
      },
      select: {
        id: true,
      },
    });
  }

  findCompanyTypeById(id: string) {
    return this.prisma.company_type.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  findTaxConditionById(id: string) {
    return this.prisma.tax_condition.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  findCurrencyById(id: string) {
    return this.prisma.currency.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  async updateCurrent(companyId: string, updateCompanyDto: UpdateCompanyDto) {
    const result = await this.prisma.company.updateMany({
      where: {
        id: companyId,
        is_active: true,
      },
      data: {
        ...(updateCompanyDto.companyTypeId && {
          company_type_id: updateCompanyDto.companyTypeId,
        }),
        ...(updateCompanyDto.taxConditionId && {
          tax_condition_id: updateCompanyDto.taxConditionId,
        }),
        ...(updateCompanyDto.currencyId && {
          currency_id: updateCompanyDto.currencyId,
        }),
        ...(updateCompanyDto.name && {
          name: updateCompanyDto.name,
        }),
        ...(updateCompanyDto.legalName !== undefined && {
          legal_name: updateCompanyDto.legalName,
        }),
        ...(updateCompanyDto.taxId && {
          tax_id: updateCompanyDto.taxId,
        }),
        ...(updateCompanyDto.email !== undefined && {
          email: updateCompanyDto.email,
        }),
        ...(updateCompanyDto.phone !== undefined && {
          phone: updateCompanyDto.phone,
        }),
        ...(updateCompanyDto.website !== undefined && {
          website: updateCompanyDto.website,
        }),
        ...(updateCompanyDto.logoUrl !== undefined && {
          logo_url: updateCompanyDto.logoUrl,
        }),
      },
    });

    if (result.count !== 1) return null;
    return this.findCurrent(companyId);
  }
}
