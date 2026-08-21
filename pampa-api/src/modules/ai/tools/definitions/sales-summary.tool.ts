import { SALE_PERMISSIONS } from '../../../commercial/sales/sale.permissions';
import type { AiTool } from '../ai-tool';
import type { AiToolsRepository } from '../ai-tools.repository';
import {
  InvalidPeriodError,
  resolvePeriod,
  SALES_PERIODS,
  type ResolvedPeriod,
} from '../period.util';
import { asOptionalString, asEnum } from '../tool-args.util';

export function createSalesSummaryTool(repository: AiToolsRepository): AiTool {
  return {
    name: 'get_sales_summary',
    description:
      'Totales de ventas confirmadas para un período: monto total, cantidad de operaciones y ticket promedio, comparado contra el período anterior equivalente.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Período a consultar.',
          enum: SALES_PERIODS,
        },
        customFrom: {
          type: 'string',
          description:
            'Fecha de inicio (YYYY-MM-DD). Requerido solo si period="custom".',
        },
        customTo: {
          type: 'string',
          description:
            'Fecha de fin (YYYY-MM-DD). Requerido solo si period="custom".',
        },
      },
      required: ['period'],
    },
    permission: SALE_PERMISSIONS.read,
    readOnly: true,
    handler: async (args, context) => {
      const period = asEnum(args, 'period', SALES_PERIODS, 'today');
      const customFrom = asOptionalString(args, 'customFrom', 10);
      const customTo = asOptionalString(args, 'customTo', 10);

      let resolved: ResolvedPeriod;
      try {
        resolved = resolvePeriod(period, customFrom, customTo);
      } catch (error) {
        if (error instanceof InvalidPeriodError) {
          return { error: 'INVALID_PERIOD', message: error.message };
        }
        throw error;
      }

      const summary = await repository.salesSummary(
        context.companyId,
        resolved.from,
        resolved.to,
      );
      return { period: resolved.label, ...summary };
    },
  };
}
