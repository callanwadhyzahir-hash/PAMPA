import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';

const companyTypeSelect = {
  id: true,
  name: true,
} satisfies Prisma.company_typeSelect;

@Injectable()
export class CompanyTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.company_type.findMany({
      orderBy: { name: 'asc' },
      select: companyTypeSelect,
    });
  }
}
