import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';

const taxConditionSelect = {
  id: true,
  name: true,
} satisfies Prisma.tax_conditionSelect;

@Injectable()
export class TaxConditionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tax_condition.findMany({
      orderBy: { name: 'asc' },
      select: taxConditionSelect,
    });
  }
}
