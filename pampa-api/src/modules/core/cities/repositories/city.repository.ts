import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class CityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive() {
    return this.prisma.city.findMany({
      where: { is_active: true, state: { is_active: true } },
      select: {
        id: true,
        name: true,
        postal_code: true,
        state: {
          select: {
            id: true,
            name: true,
            country: {
              select: { id: true, name: true, iso_code: true },
            },
          },
        },
      },
      orderBy: [
        { state: { country: { name: 'asc' } } },
        { state: { name: 'asc' } },
        { name: 'asc' },
      ],
    });
  }
}
