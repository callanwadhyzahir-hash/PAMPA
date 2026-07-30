import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

const authenticatedUserSelect = {
  id: true,
  company_id: true,
  branch_id: true,
  first_name: true,
  last_name: true,
  email: true,
  password_hash: true,
  is_active: true,
  token_version: true,
  company: {
    select: {
      id: true,
      name: true,
      is_active: true,
    },
  },
  user_role: {
    select: {
      role: {
        select: {
          company_id: true,
          system_code: true,
          name: true,
          is_active: true,
          role_permission: {
            select: {
              permission: {
                select: { code: true },
              },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: authenticatedUserSelect,
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: authenticatedUserSelect,
    });
  }

  updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { last_login_at: new Date() },
      select: { id: true },
    });
  }
}
