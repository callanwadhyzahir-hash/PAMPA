import type { AnalyticsRepository } from '../../../analytics/analytics.repository';
import { SALE_PERMISSIONS } from '../../../commercial/sales/sale.permissions';
import type { AiTool } from '../ai-tool';

/** Wraps AnalyticsRepository.dashboard() — the exact same aggregate PAMPA's own dashboard page renders, scoped to "this month" like the dashboard's default range. */
export function createBusinessOverviewTool(
  analyticsRepository: AnalyticsRepository,
): AiTool {
  return {
    name: 'get_business_overview',
    description:
      'Panorama general del negocio este mes: ventas de hoy y del mes, cobrado, pendiente de cobro, clientes y sucursales activas, y stock bajo/agotado.',
    inputSchema: { type: 'object', properties: {} },
    permission: SALE_PERMISSIONS.read,
    readOnly: true,
    handler: async (_args, context) => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const dashboard = await analyticsRepository.dashboard(
        context.companyId,
        monthStart,
      );

      return {
        salesToday: dashboard.salesToday.toNumber(),
        salesThisMonth: dashboard.salesMonth.toNumber(),
        salesCountThisMonth: dashboard.salesCount,
        collectedThisMonth: dashboard.collected.toNumber(),
        pendingToCollect: dashboard.pending.toNumber(),
        activeClients: dashboard.activeClients,
        activeBranches: dashboard.activeBranches,
        lowStockPositions: dashboard.lowStock,
        outOfStockPositions: dashboard.outOfStock,
      };
    },
  };
}
