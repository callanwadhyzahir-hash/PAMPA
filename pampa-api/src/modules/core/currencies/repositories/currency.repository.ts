import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';

const currencySelect = {
  id: true,
  name: true,
  code: true,
  is_active: true,
} satisfies Prisma.currencySelect;

@Injectable()
export class CurrencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.currency.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: currencySelect,
    });
  }
}
