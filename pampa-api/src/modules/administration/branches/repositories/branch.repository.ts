import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma.service';

const branchSelect = {
  id: true,
  name: true,
  code: true,
  email: true,
  phone: true,
  is_main: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  address: {
    select: {
      id: true,
      street: true,
      number: true,
      floor: true,
      apartment: true,
      neighborhood: true,
      zip_code: true,
      observations: true,
      city: {
        select: {
          id: true,
          name: true,
          postal_code: true,
          state: {
            select: {
              id: true,
              name: true,
              country: { select: { id: true, name: true, iso_code: true } },
            },
          },
        },
      },
    },
  },
  _count: {
    select: {
      user: true,
      warehouse: true,
      sale: true,
    },
  },
} as const;

interface AddressInput {
  cityId: string;
  street: string;
  number?: string;
  floor?: string;
  apartment?: string;
  neighborhood?: string;
  zipCode?: string;
  observations?: string;
}

@Injectable()
export class BranchRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.branch.findMany({
      where: { company_id: companyId },
      select: branchSelect,
      orderBy: [{ is_active: 'desc' }, { is_main: 'desc' }, { name: 'asc' }],
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.branch.findFirst({
      where: { id, company_id: companyId },
      select: branchSelect,
    });
  }

  findByCode(companyId: string, code: string, excludeId?: string) {
    return this.prisma.branch.findFirst({
      where: {
        company_id: companyId,
        code: { equals: code, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  findActiveCity(id: string) {
    return this.prisma.city.findFirst({
      where: { id, is_active: true },
      select: { id: true },
    });
  }

  findActiveMain(companyId: string, excludeId?: string) {
    return this.prisma.branch.findFirst({
      where: {
        company_id: companyId,
        is_main: true,
        is_active: true,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  }

  create(
    companyId: string,
    data: {
      name: string;
      code: string;
      email?: string;
      phone?: string;
      isMain: boolean;
      address: AddressInput;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          city_id: data.address.cityId,
          street: data.address.street,
          number: data.address.number,
          floor: data.address.floor,
          apartment: data.address.apartment,
          neighborhood: data.address.neighborhood,
          zip_code: data.address.zipCode,
          observations: data.address.observations,
        },
        select: { id: true },
      });
      return tx.branch.create({
        data: {
          company_id: companyId,
          address_id: address.id,
          name: data.name,
          code: data.code,
          email: data.email,
          phone: data.phone,
          is_main: data.isMain,
          is_active: true,
        },
        select: branchSelect,
      });
    });
  }

  update(
    companyId: string,
    id: string,
    data: {
      name?: string;
      code?: string;
      email?: string | null;
      phone?: string | null;
      isMain?: boolean;
      isActive?: boolean;
      address?: AddressInput;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.branch.findFirst({
        where: { id, company_id: companyId },
        select: { id: true, address_id: true },
      });
      if (!current) return null;

      if (data.isMain === true) {
        await tx.branch.updateMany({
          where: {
            company_id: companyId,
            id: { not: current.id },
            is_main: true,
          },
          data: { is_main: false },
        });
      }

      if (data.address) {
        await tx.address.update({
          where: { id: current.address_id },
          data: {
            city_id: data.address.cityId,
            street: data.address.street,
            number: data.address.number,
            floor: data.address.floor,
            apartment: data.address.apartment,
            neighborhood: data.address.neighborhood,
            zip_code: data.address.zipCode,
            observations: data.address.observations,
          },
        });
      }

      await tx.branch.update({
        where: { id: current.id },
        data: {
          name: data.name,
          code: data.code,
          email: data.email,
          phone: data.phone,
          is_main: data.isMain,
          is_active: data.isActive,
        },
      });
      return tx.branch.findFirst({
        where: { id: current.id, company_id: companyId },
        select: branchSelect,
      });
    });
  }

  deactivate(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const branch = await tx.branch.findFirst({
        where: { id, company_id: companyId },
        select: { id: true, is_main: true, is_active: true },
      });
      if (!branch) return { status: 'NOT_FOUND' as const };
      if (!branch.is_active) return { status: 'DEACTIVATED' as const };

      if (branch.is_main) {
        const replacement = await tx.branch.findFirst({
          where: {
            company_id: companyId,
            id: { not: branch.id },
            is_main: true,
            is_active: true,
          },
          select: { id: true },
        });
        if (!replacement) return { status: 'LAST_MAIN' as const };
      }

      await tx.branch.update({
        where: { id: branch.id },
        data: { is_active: false, is_main: false },
      });
      return { status: 'DEACTIVATED' as const };
    });
  }
}
