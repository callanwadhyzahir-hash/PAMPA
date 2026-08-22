import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';

const catalogSelect = {
  id: true,
  company_id: true,
  branch_id: true,
  warehouse_id: true,
  slug: true,
  display_name: true,
  description: true,
  logo_url: true,
  whatsapp: true,
  contact_email: true,
  is_enabled: true,
  show_prices: true,
  show_availability: true,
  created_at: true,
  updated_at: true,
  branch: { select: { id: true, name: true, code: true } },
  warehouse: { select: { id: true, name: true, code: true } },
} satisfies Prisma.catalogSelect;

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCompany(companyId: string) {
    return this.prisma.catalog.findUnique({
      where: { company_id: companyId },
      select: catalogSelect,
    });
  }

  findBySlug(slug: string) {
    return this.prisma.catalog.findUnique({
      where: { slug },
      select: catalogSelect,
    });
  }

  findBySlugPublic(slug: string) {
    return this.prisma.catalog.findFirst({
      where: { slug, is_enabled: true, company: { is_active: true } },
      select: {
        id: true,
        company_id: true,
        warehouse_id: true,
        slug: true,
        display_name: true,
        description: true,
        logo_url: true,
        whatsapp: true,
        show_prices: true,
        show_availability: true,
      },
    });
  }

  existsSlug(slug: string, excludeCompanyId?: string) {
    return this.prisma.catalog
      .findFirst({
        where: {
          slug,
          ...(excludeCompanyId
            ? { company_id: { not: excludeCompanyId } }
            : {}),
        },
        select: { id: true },
      })
      .then((row) => row !== null);
  }

  findBranch(companyId: string, branchId: string) {
    return this.prisma.branch.findFirst({
      where: { id: branchId, company_id: companyId, is_active: true },
      select: { id: true },
    });
  }

  findWarehouse(companyId: string, branchId: string, warehouseId: string) {
    return this.prisma.warehouse.findFirst({
      where: {
        id: warehouseId,
        company_id: companyId,
        branch_id: branchId,
        is_active: true,
      },
      select: { id: true },
    });
  }

  upsert(
    companyId: string,
    data: {
      branchId: string;
      warehouseId: string;
      slug: string;
      displayName: string;
      description?: string;
      whatsapp?: string;
      contactEmail?: string;
      isEnabled: boolean;
      showPrices: boolean;
      showAvailability: boolean;
    },
  ) {
    return this.prisma.catalog.upsert({
      where: { company_id: companyId },
      create: {
        company_id: companyId,
        branch_id: data.branchId,
        warehouse_id: data.warehouseId,
        slug: data.slug,
        display_name: data.displayName,
        description: data.description,
        whatsapp: data.whatsapp,
        contact_email: data.contactEmail,
        is_enabled: data.isEnabled,
        show_prices: data.showPrices,
        show_availability: data.showAvailability,
      },
      update: {
        branch_id: data.branchId,
        warehouse_id: data.warehouseId,
        slug: data.slug,
        display_name: data.displayName,
        description: data.description,
        whatsapp: data.whatsapp,
        contact_email: data.contactEmail,
        is_enabled: data.isEnabled,
        show_prices: data.showPrices,
        show_availability: data.showAvailability,
      },
      select: catalogSelect,
    });
  }

  countVisibleProducts(companyId: string) {
    return this.prisma.product.count({
      where: { company_id: companyId, catalog_visible: true, is_active: true },
    });
  }
}
