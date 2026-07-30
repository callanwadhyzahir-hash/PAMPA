import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSecurityContext } from '../auth/decorators/current-security-context.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { SecurityContext } from '../auth/types/security-context';
import { AnalyticsRepository } from './analytics.repository';

@ApiTags('Analytics')
@ApiCookieAuth('pampa_access')
@Controller()
export class AnalyticsController {
  constructor(private readonly repository: AnalyticsRepository) {}

  @Get('dashboard/metrics')
  @RequirePermissions('sales.read')
  dashboard(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('range') range = 'month',
    @Query('branchId') branchId?: string,
  ) {
    const now = new Date();
    const from =
      range === 'today'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : range === '7d'
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : new Date(now.getFullYear(), now.getMonth(), 1);
    return this.repository.dashboard(context.companyId, from, branchId);
  }

  @Get('reports')
  @RequirePermissions('sales.read')
  reports(
    @CurrentSecurityContext() context: SecurityContext,
    @Query('from') fromValue?: string,
    @Query('to') toValue?: string,
    @Query('branchId') branchId?: string,
  ) {
    const now = new Date();
    const from = fromValue
      ? new Date(`${fromValue}T00:00:00`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toValue
      ? new Date(`${toValue}T23:59:59.999`)
      : new Date(now.getTime() + 1);
    return this.repository.reports(context.companyId, from, to, branchId);
  }
}
