import type { StockService } from '../../../inventory/stock/stock.service';
import { STOCK_PERMISSIONS } from '../../../inventory/stock/stock.permissions';
import type { AiTool } from '../ai-tool';
import { asOptionalInt } from '../tool-args.util';

const DEFAULT_LIMIT = 20;

/**
 * Wraps StockService.findAll({ lowStock: true }) — the real, existing "low
 * stock" rule already used by the Stock module and the dashboard
 * (quantity <= minimum_quantity, per warehouse position). No new threshold
 * is invented here.
 */
export function createLowStockProductsTool(stockService: StockService): AiTool {
  return {
    name: 'get_low_stock_products',
    description:
      'Lista posiciones de stock (producto + depósito) cuya cantidad actual está en o por debajo del mínimo configurado.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          description: 'Máximo de resultados (1-50). Por defecto 20.',
        },
      },
    },
    permission: STOCK_PERMISSIONS.read,
    readOnly: true,
    handler: async (args, context) => {
      const limit = asOptionalInt(args, 'limit', {
        min: 1,
        max: 50,
        fallback: DEFAULT_LIMIT,
      });
      const rows = await stockService.findAll(context, { lowStock: true });

      return {
        totalLowStockPositions: rows.length,
        positions: rows.slice(0, limit).map((row) => ({
          productName: row.product.name,
          sku: row.product.code,
          warehouseName: row.warehouse.name,
          quantity: row.quantity.toNumber(),
          minimumQuantity: row.minimum_quantity.toNumber(),
          unit: row.product.unit,
        })),
      };
    },
  };
}
