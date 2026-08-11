import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

interface CompanyFilters {
  page: number;
  limit: number;
  search?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
}

interface UserFilters {
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class PlatformAdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        company: { select: { name: true } },
      },
    });
  }

  findPlatformAdminByUserId(userId: string) {
    return this.prisma.platform_admin.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
  }

  createPlatformAdmin(userId: string) {
    return this.prisma.platform_admin.create({
      data: { user_id: userId },
      select: { id: true },
    });
  }

  async overview() {
    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalUsers,
      activeUsers,
      totalBranches,
      totalProducts,
      totalClients,
      totalSales,
    ] = await Promise.all([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { is_active: true } }),
      this.prisma.company.count({ where: { is_active: false } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { is_active: true } }),
      this.prisma.branch.count(),
      this.prisma.product.count(),
      this.prisma.client.count(),
      this.prisma.sale.count(),
    ]);
    return {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalUsers,
      activeUsers,
      totalBranches,
      totalProducts,
      totalClients,
      totalSales,
    };
  }

  async listCompanies(filters: CompanyFilters) {
    const where: Prisma.companyWhereInput = {
      ...(filters.status === 'ACTIVE' ? { is_active: true } : {}),
      ...(filters.status === 'SUSPENDED' ? { is_active: false } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { tax_id: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        select: {
          id: true,
          name: true,
          is_active: true,
          created_at: true,
          _count: {
            select: {
              user: true,
              branch: true,
              product: true,
              client: true,
              sale: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    const companyIds = items.map((company) => company.id);
    const lastSales = companyIds.length
      ? await this.prisma.sale.groupBy({
          by: ['company_id'],
          where: { company_id: { in: companyIds } },
          _max: { sale_date: true },
        })
      : [];
    const lastSaleByCompany = new Map(
      lastSales.map((row) => [row.company_id, row._max.sale_date]),
    );

    return {
      items: items.map((company) => ({
        id: company.id,
        name: company.name,
        isActive: company.is_active,
        createdAt: company.created_at,
        usersCount: company._count.user,
        branchesCount: company._count.branch,
        productsCount: company._count.product,
        clientsCount: company._count.client,
        salesCount: company._count.sale,
        lastSaleAt: lastSaleByCompany.get(company.id) ?? null,
      })),
      total,
    };
  }

  async getCompanyDetail(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        legal_name: true,
        tax_id: true,
        email: true,
        phone: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: {
            user: true,
            branch: true,
            warehouse: true,
            product: true,
            client: true,
            sale: true,
          },
        },
      },
    });
    if (!company) return null;

    const [activeUsers, payments, stockMovements] = await Promise.all([
      this.prisma.user.count({ where: { company_id: id, is_active: true } }),
      this.prisma.payment.count({ where: { company_id: id } }),
      this.prisma.stock_movement.count({ where: { company_id: id } }),
    ]);

    return {
      id: company.id,
      name: company.name,
      legalName: company.legal_name,
      taxId: company.tax_id,
      email: company.email,
      phone: company.phone,
      isActive: company.is_active,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
      counts: {
        users: company._count.user,
        activeUsers,
        branches: company._count.branch,
        warehouses: company._count.warehouse,
        products: company._count.product,
        clients: company._count.client,
        sales: company._count.sale,
        payments,
        stockMovements,
      },
    };
  }

  async updateCompanyStatus(id: string, isActive: boolean) {
    const result = await this.prisma.company.updateMany({
      where: { id },
      data: { is_active: isActive },
    });
    if (result.count !== 1) return null;
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true, name: true, is_active: true },
    });
    if (!company) return null;
    return { id: company.id, name: company.name, isActive: company.is_active };
  }

  async listUsers(filters: UserFilters) {
    const where: Prisma.userWhereInput = filters.search
      ? {
          OR: [
            { first_name: { contains: filters.search, mode: 'insensitive' } },
            { last_name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          email_verified_at: true,
          is_active: true,
          last_login_at: true,
          created_at: true,
          company: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((user) => ({
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        emailVerified: user.email_verified_at !== null,
        isActive: user.is_active,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        company: user.company,
      })),
      total,
    };
  }
}
