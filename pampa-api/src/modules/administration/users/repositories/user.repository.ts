import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../../database/prisma.service';

const publicUserSelect = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  phone: true,
  branch_id: true,
  is_active: true,
  last_login_at: true,
  created_at: true,
  updated_at: true,
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
      is_active: true,
    },
  },
  user_role: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
          system_code: true,
          is_system: true,
          is_active: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: { company_id: companyId },
      select: publicUserSelect,
      orderBy: [
        { is_active: 'desc' },
        { last_name: 'asc' },
        { first_name: 'asc' },
      ],
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, company_id: companyId },
      select: publicUserSelect,
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
  }

  findActiveBranch(companyId: string, branchId: string) {
    return this.prisma.branch.findFirst({
      where: { id: branchId, company_id: companyId, is_active: true },
      select: { id: true },
    });
  }

  create(
    companyId: string,
    data: {
      firstName: string;
      lastName: string;
      email: string;
      passwordHash: string;
      phone?: string;
      branchId?: string | null;
    },
  ) {
    return this.prisma.user.create({
      data: {
        company_id: companyId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password_hash: data.passwordHash,
        phone: data.phone,
        branch_id: data.branchId,
      },
      select: publicUserSelect,
    });
  }

  update(
    companyId: string,
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      branchId?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id, company_id: companyId },
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          branch_id: data.branchId,
          is_active: data.isActive,
        },
      });
      if (result.count !== 1) return null;
      return tx.user.findFirst({
        where: { id, company_id: companyId },
        select: publicUserSelect,
      });
    });
  }
}
