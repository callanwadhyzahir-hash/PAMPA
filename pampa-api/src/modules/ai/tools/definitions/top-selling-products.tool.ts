import { SALE_PERMISSIONS } from '../../../commercial/sales/sale.permissions';
import type { AiTool } from '../ai-tool';
import type { AiToolsRepository } from '../ai-tools.repository';
import {
  InvalidPeriodError,
  resolvePeriod,
  SALES_PERIODS,
  type ResolvedPeriod,
} from '../period.util';
import { asEnum, asOptionalInt, asOptionalString } from '../tool-args.util';

export function createTopSellingProductsTool(
  repository: AiToolsRepository,
): AiTool {
  return {
    name: 'get_top_selling_products',
    description:
      'Productos más vendidos en un período, ordenados por facturación, con unidades vendidas y monto.',
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
          description: 'YYYY-MM-DD, solo si period="custom".',
        },
        customTo: {
          type: 'string',
          description: 'YYYY-MM-DD, solo si period="custom".',
        },
        limit: {
          type: 'integer',
          description:
            'Cantidad de productos a devolver (1-20). Por defecto 5.',
        },
      },
      required: ['period'],
    },
    permission: SALE_PERMISSIONS.read,
    readOnly: true,
    handler: async (args, context) => {
      const period = asEnum(args, 'period', SALES_PERIODS, 'last_30_days');
      const customFrom = asOptionalString(args, 'customFrom', 10);
      const customTo = asOptionalString(args, 'customTo', 10);
      const limit = asOptionalInt(args, 'limit', {
        min: 1,
        max: 20,
        fallback: 5,
      });

      let resolved: ResolvedPeriod;
      try {
        resolved = resolvePeriod(period, customFrom, customTo);
      } catch (error) {
        if (error instanceof InvalidPeriodError) {
          return { error: 'INVALID_PERIOD', message: error.message };
        }
        throw error;
      }

      const products = await repository.topSellingProducts(
        context.companyId,
        resolved.from,
        resolved.to,
        limit,
      );
      return { period: resolved.label, products };
    },
  };
}
