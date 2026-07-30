import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../database/prisma.service';
import { CreateCountryDto } from '../dto/create-country.dto';
import { UpdateCountryDto } from '../dto/update-country.dto';

@Injectable()
export class CountryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.country.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.country.findUnique({
      where: {
        id,
      },
    });
  }

  async findByName(name: string) {
    return this.prisma.country.findFirst({
      where: {
        name,
        is_active: true,
      },
    });
  }

  async findByIsoCode(isoCode: string) {
    return this.prisma.country.findFirst({
      where: {
        iso_code: isoCode,
        is_active: true,
      },
    });
  }

  async findByIsoCodeIncludingInactive(isoCode: string) {
    return this.prisma.country.findFirst({
      where: {
        iso_code: isoCode,
      },
    });
  }

  async findByNameExcludingId(name: string, id: string) {
    return this.prisma.country.findFirst({
      where: {
        name,
        is_active: true,
        NOT: {
          id,
        },
      },
    });
  }

  async findByIsoCodeExcludingId(isoCode: string, id: string) {
    return this.prisma.country.findFirst({
      where: {
        iso_code: isoCode,
        is_active: true,
        NOT: {
          id,
        },
      },
    });
  }

  async create(createCountryDto: CreateCountryDto) {
    return this.prisma.country.create({
      data: {
        name: createCountryDto.name,
        iso_code: createCountryDto.isoCode,
        phone_code: createCountryDto.phoneCode,
        is_active: createCountryDto.isActive ?? true,
      },
    });
  }

  async reactivate(id: string, createCountryDto: CreateCountryDto) {
    return this.prisma.country.update({
      where: {
        id,
      },
      data: {
        name: createCountryDto.name,
        iso_code: createCountryDto.isoCode,
        phone_code: createCountryDto.phoneCode,
        is_active: true,
      },
    });
  }

  async update(id: string, updateCountryDto: UpdateCountryDto) {
    return this.prisma.country.update({
      where: {
        id,
      },
      data: {
        ...(updateCountryDto.name && {
          name: updateCountryDto.name,
        }),
        ...(updateCountryDto.isoCode && {
          iso_code: updateCountryDto.isoCode,
        }),
        ...(updateCountryDto.phoneCode !== undefined && {
          phone_code: updateCountryDto.phoneCode,
        }),
        ...(updateCountryDto.isActive !== undefined && {
          is_active: updateCountryDto.isActive,
        }),
      },
    });
  }

  async delete(id: string) {
    return this.prisma.country.update({
      where: {
        id,
      },
      data: {
        is_active: false,
      },
    });
  }
}
