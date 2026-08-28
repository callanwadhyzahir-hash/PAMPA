import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import type { ComponentStatus } from './system-status.types';

interface CompanyFilters {
  page: number;
  limit: number;
  search?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  hasUsers?: 'WITH' | 'WITHOUT';
  createdWithinDays?: 7 | 30 | 90;
}

interface UserFilters {
  page: number;
  limit: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  emailVerified?: 'VERIFIED' | 'PENDING';
  roleCode?: string;
  neverLoggedIn?: boolean;
  createdWithinDays?: 7 | 30 | 90;
  sortBy?: 'createdAt' | 'lastLoginAt' | 'firstName' | 'company';
  sortDir?: 'asc' | 'desc';
}

function sinceDays(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
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

  async securitySummary() {
    const now = Date.now();
    const since24h = new Date(now - 24 * 60 * 60 * 1000);
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const deliveryFailureTypes = [
      'EMAIL_VERIFICATION_DELIVERY_FAILED',
      'PASSWORD_RESET_DELIVERY_FAILED',
    ];

    const [
      totalUsers,
      pendingVerification,
      deactivatedUsers,
      emailsSent7d,
      emailsVerified7d,
      deliveryFailures7d,
      deliveryFailures30d,
      failedLogins24h,
      failedLogins7d,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { email_verified_at: null } }),
      this.prisma.user.count({ where: { is_active: false } }),
      this.prisma.security_event.count({
        where: {
          event_type: 'EMAIL_VERIFICATION_SENT',
          created_at: { gte: since7d },
        },
      }),
      this.prisma.security_event.count({
        where: { event_type: 'EMAIL_VERIFIED', created_at: { gte: since7d } },
      }),
      this.prisma.security_event.count({
        where: {
          event_type: { in: deliveryFailureTypes },
          created_at: { gte: since7d },
        },
      }),
      this.prisma.security_event.count({
        where: {
          event_type: { in: deliveryFailureTypes },
          created_at: { gte: since30d },
        },
      }),
      this.prisma.security_event.count({
        where: { event_type: 'LOGIN_FAILED', created_at: { gte: since24h } },
      }),
      this.prisma.security_event.count({
        where: { event_type: 'LOGIN_FAILED', created_at: { gte: since7d } },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        pendingVerification,
        verified: totalUsers - pendingVerification,
        deactivated: deactivatedUsers,
      },
      emails: {
        sentLast7d: emailsSent7d,
        verifiedLast7d: emailsVerified7d,
        deliveryFailuresLast7d: deliveryFailures7d,
        deliveryFailuresLast30d: deliveryFailures30d,
      },
      auth: {
        failedLoginsLast24h: failedLogins24h,
        failedLoginsLast7d: failedLogins7d,
      },
    };
  }

  async growthSeries(days: number) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const [userRows, companyRows, loginRows] = await Promise.all([
      this.prisma.$queryRaw<{ day: Date; count: number }[]>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*)::int AS count
        FROM "user"
        WHERE "created_at" >= ${since}
        GROUP BY day
        ORDER BY day
      `,
      this.prisma.$queryRaw<{ day: Date; count: number }[]>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*)::int AS count
        FROM "company"
        WHERE "created_at" >= ${since}
        GROUP BY day
        ORDER BY day
      `,
      this.prisma.$queryRaw<{ day: Date; count: number }[]>`
        SELECT date_trunc('day', "created_at") AS day, COUNT(*)::int AS count
        FROM "security_event"
        WHERE "event_type" = 'LOGIN_SUCCEEDED' AND "created_at" >= ${since}
        GROUP BY day
        ORDER BY day
      `,
    ]);

    return { since, userRows, companyRows, loginRows };
  }

  async databaseHealth(): Promise<{
    status: ComponentStatus;
    latencyMs: number | null;
  }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return { status: latencyMs > 500 ? 'DEGRADED' : 'HEALTHY', latencyMs };
    } catch {
      return { status: 'UNAVAILABLE', latencyMs: null };
    }
  }

  async migrationsHealth(): Promise<{
    status: ComponentStatus;
    appliedCount: number | null;
    latestMigration: string | null;
    latestAppliedAt: Date | null;
    pending: boolean | null;
  }> {
    try {
      const rows = await this.prisma.$queryRaw<
        { migration_name: string; finished_at: Date | null }[]
      >`
        SELECT migration_name, finished_at
        FROM "_prisma_migrations"
        ORDER BY started_at DESC
        LIMIT 5
      `;
      if (rows.length === 0) {
        return {
          status: 'UNKNOWN',
          appliedCount: null,
          latestMigration: null,
          latestAppliedAt: null,
          pending: null,
        };
      }
      const [countRow] = await this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::int AS count FROM "_prisma_migrations"
      `;
      const pending = rows.some((row) => row.finished_at === null);
      return {
        status: pending ? 'DEGRADED' : 'HEALTHY',
        appliedCount: countRow?.count ?? null,
        latestMigration: rows[0].migration_name,
        latestAppliedAt: rows[0].finished_at,
        pending,
      };
    } catch {
      return {
        status: 'UNKNOWN',
        appliedCount: null,
        latestMigration: null,
        latestAppliedAt: null,
        pending: null,
      };
    }
  }

  async listCompanies(filters: CompanyFilters) {
    const where: Prisma.companyWhereInput = {
      ...(filters.status === 'ACTIVE' ? { is_active: true } : {}),
      ...(filters.status === 'SUSPENDED' ? { is_active: false } : {}),
      ...(filters.hasUsers === 'WITH' ? { user: { some: {} } } : {}),
      ...(filters.hasUsers === 'WITHOUT' ? { user: { none: {} } } : {}),
      ...(filters.createdWithinDays
        ? { created_at: { gte: sinceDays(filters.createdWithinDays) } }
        : {}),
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

    const [activeUsers, payments, stockMovements, owners] = await Promise.all([
      this.prisma.user.count({ where: { company_id: id, is_active: true } }),
      this.prisma.payment.count({ where: { company_id: id } }),
      this.prisma.stock_movement.count({ where: { company_id: id } }),
      this.prisma.user.findMany({
        where: {
          company_id: id,
          user_role: {
            some: { company_id: id, role: { system_code: 'OWNER' } },
          },
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          is_active: true,
        },
        orderBy: { created_at: 'asc' },
      }),
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
      owners: owners.map((owner) => ({
        id: owner.id,
        firstName: owner.first_name,
        lastName: owner.last_name,
        email: owner.email,
        isActive: owner.is_active,
      })),
    };
  }

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        is_active: true,
        email_verified_at: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        company: { select: { id: true, name: true, is_active: true } },
        branch: { select: { id: true, name: true } },
        user_role: {
          select: {
            role: { select: { id: true, name: true, system_code: true } },
          },
        },
      },
    });
    if (!user) return null;

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      isActive: user.is_active,
      emailVerifiedAt: user.email_verified_at,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      company: user.company,
      branch: user.branch,
      roles: user.user_role.map((entry) => ({
        id: entry.role.id,
        name: entry.role.name,
        systemCode: entry.role.system_code,
      })),
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

  // Deletes a company and every row that hangs off it. Order follows the
  // RESTRICT foreign keys in schema.prisma bottom-up — tables with
  // onDelete: Cascade/SetNull clean themselves up and are skipped here.
  async deleteCompany(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id },
        select: { id: true, name: true },
      });
      if (!company) return null;

      const scope = { company_id: id };
      await tx.invoice_fiscal_attempt.deleteMany({ where: scope });
      await tx.invoice.deleteMany({ where: scope });
      await tx.catalog_order.deleteMany({ where: scope });
      await tx.catalog.deleteMany({ where: scope });
      await tx.payment.deleteMany({ where: scope });
      await tx.stock.deleteMany({ where: scope });
      await tx.stock_movement.deleteMany({ where: scope });
      await tx.mercadolibre_connection.deleteMany({ where: scope });
      await tx.sale.deleteMany({ where: scope });
      await tx.product.deleteMany({ where: scope });
      await tx.product_category.deleteMany({ where: scope });
      await tx.role.deleteMany({ where: scope });
      await tx.user.deleteMany({ where: scope });
      await tx.client.deleteMany({ where: scope });
      await tx.warehouse.deleteMany({ where: scope });
      await tx.branch.deleteMany({ where: scope });
      await tx.company.delete({ where: { id } });

      return company;
    });
  }

  // A user can only be hard-deleted if they never authored business
  // records (sales, payments, stock movements) — deleting them would tear
  // out real transaction history. Otherwise: deactivate instead.
  async userDeleteBlockers(id: string) {
    const [sales, payments, stockMovements] = await Promise.all([
      this.prisma.sale.count({ where: { user_id: id } }),
      this.prisma.payment.count({ where: { created_by: id } }),
      this.prisma.stock_movement.count({ where: { created_by: id } }),
    ]);
    return { sales, payments, stockMovements };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, first_name: true, last_name: true, email: true },
    });
    if (!user) return null;
    // Everything else referencing user_id (session, tokens, platform_admin,
    // user_role, user_onboarding_progress) is onDelete: Cascade/SetNull.
    await this.prisma.user.delete({ where: { id } });
    return user;
  }

  async listUsers(filters: UserFilters) {
    const where: Prisma.userWhereInput = {
      ...(filters.status === 'ACTIVE' ? { is_active: true } : {}),
      ...(filters.status === 'INACTIVE' ? { is_active: false } : {}),
      ...(filters.emailVerified === 'VERIFIED'
        ? { email_verified_at: { not: null } }
        : {}),
      ...(filters.emailVerified === 'PENDING'
        ? { email_verified_at: null }
        : {}),
      ...(filters.neverLoggedIn ? { last_login_at: null } : {}),
      ...(filters.createdWithinDays
        ? { created_at: { gte: sinceDays(filters.createdWithinDays) } }
        : {}),
      ...(filters.roleCode
        ? { user_role: { some: { role: { system_code: filters.roleCode } } } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { first_name: { contains: filters.search, mode: 'insensitive' } },
              { last_name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const sortDir = filters.sortDir ?? 'desc';
    const orderBy: Prisma.userOrderByWithRelationInput =
      filters.sortBy === 'lastLoginAt'
        ? { last_login_at: sortDir }
        : filters.sortBy === 'firstName'
          ? { first_name: sortDir }
          : filters.sortBy === 'company'
            ? { company: { name: sortDir } }
            : { created_at: sortDir };

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
        orderBy,
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
