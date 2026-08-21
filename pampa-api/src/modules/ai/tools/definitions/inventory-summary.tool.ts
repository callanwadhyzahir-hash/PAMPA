import type { StockService } from '../../../inventory/stock/stock.service';
import { STOCK_PERMISSIONS } from '../../../inventory/stock/stock.permissions';
import type { AiTool } from '../ai-tool';

/** Wraps StockService.summary() — same aggregate the Stock module itself exposes. */
export function createInventorySummaryTool(stockService: StockService): AiTool {
  return {
    name: 'get_inventory_summary',
    description:
      'Resumen general del inventario: cantidad de productos, depósitos, unidades totales, productos en stock bajo y productos sin stock.',
    inputSchema: { type: 'object', properties: {} },
    permission: STOCK_PERMISSIONS.read,
    readOnly: true,
    handler: async (_args, context) => {
      const summary = await stockService.summary(context);
      return {
        products: summary.products,
        warehouses: summary.warehouses,
        totalUnits: summary.units.toNumber(),
        lowStockPositions: summary.lowStock,
        outOfStockPositions: summary.outOfStock,
      };
    },
  };
}
