import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service';

@Injectable()
export class TenantIntegrityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async audit() {
    const [
      userBranch,
      userRole,
      warehouseBranch,
      duplicateMain,
      sharedBranchAddress,
    ] = await Promise.all([
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM "user" u
        JOIN branch b ON b.id = u.branch_id
        WHERE u.company_id <> b.company_id
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM user_role ur
        JOIN "user" u ON u.id = ur.user_id
        JOIN role r ON r.id = ur.role_id
        WHERE u.company_id <> r.company_id
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM warehouse w
        JOIN branch b ON b.id = w.branch_id
        WHERE w.company_id <> b.company_id
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT company_id
          FROM branch
          WHERE is_main = true AND is_active = true
          GROUP BY company_id
          HAVING COUNT(*) > 1
        ) conflicts
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT address_id
          FROM branch
          GROUP BY address_id
          HAVING COUNT(DISTINCT company_id) > 1
        ) conflicts
      `,
    ]);

    return {
      crossTenantUserBranch: Number(userBranch[0]?.count ?? 0),
      crossTenantUserRole: Number(userRole[0]?.count ?? 0),
      crossTenantWarehouseBranch: Number(warehouseBranch[0]?.count ?? 0),
      companiesWithMultipleActiveMainBranches: Number(
        duplicateMain[0]?.count ?? 0,
      ),
      branchAddressesSharedAcrossCompanies: Number(
        sharedBranchAddress[0]?.count ?? 0,
      ),
    };
  }
}
