import type { ProductsService } from '../../../catalog/products/products.service';
import { PRODUCT_PERMISSIONS } from '../../../catalog/products/product.permissions';
import type { AiTool } from '../ai-tool';
import {
  asOptionalBoolean,
  asOptionalInt,
  asOptionalString,
} from '../tool-args.util';

/** Wraps ProductsService.findAll — the exact same search PAMPA's product list already uses (name/SKU/barcode, via ProductRepository.findAll's OR clause). */
export function createSearchProductsTool(
  productsService: ProductsService,
): AiTool {
  return {
    name: 'search_products',
    description:
      'Busca productos del catálogo de la empresa por nombre, SKU o código de barras. Devuelve precio, stock total y si están en stock bajo.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Texto a buscar en nombre, SKU o código de barras.',
        },
        includeInactive: {
          type: 'boolean',
          description: 'Incluir productos desactivados. Por defecto false.',
        },
        limit: {
          type: 'integer',
          description: 'Máximo de resultados (1-20). Por defecto 10.',
        },
      },
    },
    permission: PRODUCT_PERMISSIONS.read,
    readOnly: true,
    handler: async (args, context) => {
      const search = asOptionalString(args, 'query', 100);
      const includeInactive =
        asOptionalBoolean(args, 'includeInactive') ?? false;
      const limit = asOptionalInt(args, 'limit', {
        min: 1,
        max: 20,
        fallback: 10,
      });

      const result = await productsService.findAll(context, {
        search,
        isActive: includeInactive ? undefined : true,
        page: 1,
        limit,
      });

      return {
        totalMatches: result.pagination.total,
        products: result.items.map((product) => ({
          sku: product.code,
          name: product.name,
          barcode: product.barcode,
          unit: product.unit,
          salePrice: product.sale_price.toNumber(),
          totalStock: product.total_stock.toNumber(),
          lowStock: product.low_stock,
          isActive: product.is_active,
        })),
      };
    },
  };
}
