import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import type { UpdateProgressDto } from './dto/update-progress.dto';

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  listProgress(userId: string) {
    return this.prisma.user_onboarding_progress.findMany({
      where: { user_id: userId },
    });
  }

  async upsertProgress(
    userId: string,
    companyId: string,
    tourId: string,
    patch: UpdateProgressDto,
  ) {
    const completedAt = patch.status === 'completed' ? new Date() : undefined;
    return this.prisma.user_onboarding_progress.upsert({
      where: { user_id_tour_id: { user_id: userId, tour_id: tourId } },
      create: {
        user_id: userId,
        company_id: companyId,
        tour_id: tourId,
        status: patch.status,
        current_step: patch.currentStep ?? 0,
        onboarding_version: patch.onboardingVersion ?? 1,
        completed_at: completedAt,
      },
      update: {
        status: patch.status,
        ...(patch.currentStep !== undefined
          ? { current_step: patch.currentStep }
          : {}),
        ...(patch.onboardingVersion !== undefined
          ? { onboarding_version: patch.onboardingVersion }
          : {}),
        ...(completedAt ? { completed_at: completedAt } : {}),
      },
    });
  }

  async setupStatus(companyId: string) {
    const [
      branches,
      warehouses,
      categories,
      products,
      stockEntries,
      clients,
      sales,
      mercadolibreConnection,
    ] = await Promise.all([
      this.prisma.branch.count({ where: { company_id: companyId } }),
      this.prisma.warehouse.count({ where: { company_id: companyId } }),
      this.prisma.product_category.count({ where: { company_id: companyId } }),
      this.prisma.product.count({ where: { company_id: companyId } }),
      this.prisma.stock.count({
        where: { company_id: companyId, quantity: { gt: 0 } },
      }),
      this.prisma.client.count({ where: { company_id: companyId } }),
      this.prisma.sale.count({
        where: {
          company_id: companyId,
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
      }),
      this.prisma.mercadolibre_connection.count({
        where: { company_id: companyId },
      }),
    ]);

    return {
      company: true,
      branches: branches > 0,
      warehouses: warehouses > 0,
      categories: categories > 0,
      products: products > 0,
      stock: stockEntries > 0,
      clients: clients > 0,
      sales: sales > 0,
      mercadolibre: mercadolibreConnection > 0,
    };
  }
}
