import type { SecurityContext } from '../../auth/types/security-context';
import type { AiGatewayService } from '../../ai/gateway/ai-gateway.service';
import type { AiExtractionResult } from '../../ai/gateway/ai-extraction.types';
import type { ProductCategoriesService } from '../../catalog/product-categories/product-categories.service';
import type { ProductsService } from '../../catalog/products/products.service';
import type { ProductVariantsService } from '../../catalog/products/variants/product-variants.service';
import type { StockService } from '../stock/stock.service';
import { SmartImportService } from './smart-import.service';

const context: SecurityContext = {
  userId: 'user-1',
  companyId: 'company-1',
  branchId: null,
  sessionId: 'session-1',
  tokenVersion: 0,
  email: 'a@a.com',
  roles: [],
  permissions: ['ai.use', 'products.create', 'stock.adjust'],
  isPlatformAdmin: false,
};

function extraction(
  overrides: Partial<AiExtractionResult> = {},
): AiExtractionResult {
  return {
    provider: 'gemini',
    products: [
      {
        name: 'Remera Nike Negra',
        sku: null,
        barcode: null,
        brand: 'Nike',
        category: 'Remeras',
        size: 'M',
        color: null,
        description: null,
        price: 25000,
        stock: 10,
      },
    ],
    ...overrides,
  };
}

function makeDeps() {
  const gateway = {
    extractProducts: jest.fn().mockResolvedValue(extraction()),
  };
  const products = {
    findDuplicateCandidates: jest.fn().mockResolvedValue([]),
    generateCodeFromName: jest.fn().mockResolvedValue('REMERA-NIKE-NEGRA'),
    create: jest
      .fn<Promise<{ id: string; code: string }>, [SecurityContext, unknown]>()
      .mockResolvedValue({ id: 'product-1', code: 'REMERA-NIKE-NEGRA' }),
  };
  const variants = {
    create: jest.fn().mockResolvedValue({ id: 'variant-1', label: 'M' }),
  };
  const categories = {
    findAll: jest.fn().mockResolvedValue([]),
  };
  const stock = {
    adjust: jest
      .fn<Promise<unknown>, [SecurityContext, unknown]>()
      .mockResolvedValue({}),
  };
  return { gateway, products, variants, categories, stock };
}

function makeService(deps: ReturnType<typeof makeDeps>) {
  return new SmartImportService(
    deps.gateway as unknown as AiGatewayService,
    deps.products as unknown as ProductsService,
    deps.variants as unknown as ProductVariantsService,
    deps.categories as unknown as ProductCategoriesService,
    deps.stock as unknown as StockService,
  );
}

describe('SmartImportService.extractFromText — preview', () => {
  it('passes plain text through to AiGatewayService.extractProducts scoped by the authenticated context', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await service.extractFromText(context, 'Remera Nike x10 $25000');

    expect(deps.gateway.extractProducts).toHaveBeenCalledWith(context, {
      text: 'Remera Nike x10 $25000',
    });
  });

  it('combines size and color into a single variant label (PAMPA has no separate columns for either)', async () => {
    const deps = makeDeps();
    deps.gateway.extractProducts.mockResolvedValue(
      extraction({
        products: [
          {
            name: 'Remera',
            sku: null,
            barcode: null,
            brand: null,
            category: null,
            size: 'M',
            color: 'Negro',
            description: null,
            price: 100,
            stock: 1,
          },
        ],
      }),
    );
    const service = makeService(deps);

    const preview = await service.extractFromText(context, 'Remera M Negro');

    expect(preview.items[0].variantLabel).toBe('M · Negro');
  });

  it('flags a barcode that already exists for the company as DUPLICATE_BARCODE', async () => {
    const deps = makeDeps();
    deps.gateway.extractProducts.mockResolvedValue(
      extraction({
        products: [
          {
            name: 'Producto existente',
            sku: null,
            barcode: '7791234567890',
            brand: null,
            category: null,
            size: null,
            color: null,
            description: null,
            price: 100,
            stock: 1,
          },
        ],
      }),
    );
    deps.products.findDuplicateCandidates.mockResolvedValue([
      { id: 'p-1', code: 'X', barcode: '7791234567890', name: 'Otro nombre' },
    ]);
    const service = makeService(deps);

    const preview = await service.extractFromText(context, 'algo');

    expect(preview.items[0].warnings).toContain('DUPLICATE_BARCODE');
    expect(preview.items[0].status).toBe('WARNING');
  });

  it('flags a name that matches an existing product as POSSIBLE_DUPLICATE_NAME (only when barcode did not already match)', async () => {
    const deps = makeDeps();
    deps.products.findDuplicateCandidates.mockResolvedValue([
      { id: 'p-1', code: 'X', barcode: null, name: 'remera nike negra' },
    ]);
    const service = makeService(deps);

    const preview = await service.extractFromText(context, 'algo');

    expect(preview.items[0].warnings).toContain('POSSIBLE_DUPLICATE_NAME');
  });

  it('flags missing price and stock instead of guessing a value', async () => {
    const deps = makeDeps();
    deps.gateway.extractProducts.mockResolvedValue(
      extraction({
        products: [
          {
            name: 'Producto sin datos',
            sku: null,
            barcode: null,
            brand: null,
            category: null,
            size: null,
            color: null,
            description: null,
            price: null,
            stock: null,
          },
        ],
      }),
    );
    const service = makeService(deps);

    const preview = await service.extractFromText(context, 'algo');

    expect(preview.items[0].warnings).toEqual(
      expect.arrayContaining(['MISSING_PRICE', 'MISSING_STOCK']),
    );
    expect(preview.items[0].price).toBeNull();
    expect(preview.items[0].stock).toBeNull();
  });

  it('matches an extracted category name to an existing category (case/accent-insensitive) instead of leaving it unset', async () => {
    const deps = makeDeps();
    deps.categories.findAll.mockResolvedValue([
      { id: 'cat-1', name: 'Remeras' },
    ]);
    const service = makeService(deps);

    const preview = await service.extractFromText(context, 'algo');

    expect(preview.items[0].categoryId).toBe('cat-1');
    expect(preview.items[0].warnings).not.toContain('CATEGORY_NOT_FOUND');
  });

  it('flags CATEGORY_NOT_FOUND instead of inventing a new category when nothing matches', async () => {
    const deps = makeDeps();
    deps.categories.findAll.mockResolvedValue([
      { id: 'cat-1', name: 'Pantalones' },
    ]);
    const service = makeService(deps);

    const preview = await service.extractFromText(context, 'algo');

    expect(preview.items[0].categoryId).toBeNull();
    expect(preview.items[0].warnings).toContain('CATEGORY_NOT_FOUND');
  });

  it('returns status VALID with no warnings when nothing is ambiguous', async () => {
    const deps = makeDeps();
    deps.categories.findAll.mockResolvedValue([
      { id: 'cat-1', name: 'Remeras' },
    ]);
    const service = makeService(deps);

    const preview = await service.extractFromText(context, 'algo');

    expect(preview.items[0].status).toBe('VALID');
    expect(preview.items[0].warnings).toEqual([]);
  });
});

describe('SmartImportService.confirm — real import', () => {
  it('creates the product, its variant, and an INITIAL stock movement for the given warehouse', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    const result = await service.confirm(context, {
      warehouseId: 'wh-1',
      items: [
        {
          name: 'Remera Nike Negra',
          variantLabel: 'M',
          salePrice: 25000,
          stock: 10,
        },
      ],
    });

    expect(deps.products.create).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        name: 'Remera Nike Negra',
        salePrice: 25000,
        cost: 0,
      }),
    );
    expect(deps.variants.create).toHaveBeenCalledWith(context, 'product-1', {
      label: 'M',
    });
    expect(deps.stock.adjust).toHaveBeenCalledWith(context, {
      productId: 'product-1',
      variantId: 'variant-1',
      warehouseId: 'wh-1',
      movementType: 'INITIAL',
      quantity: 10,
      reason: 'Carga inteligente de stock (IA)',
    });
    expect(result).toEqual({
      created: 1,
      failed: 0,
      items: [
        {
          name: 'Remera Nike Negra',
          status: 'CREATED',
          productId: 'product-1',
          variantId: 'variant-1',
        },
      ],
    });
  });

  it('skips stock.adjust when no stock quantity was given, but still creates the product', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await service.confirm(context, {
      warehouseId: 'wh-1',
      items: [{ name: 'Producto sin stock', salePrice: 100 }],
    });

    expect(deps.products.create).toHaveBeenCalledTimes(1);
    expect(deps.stock.adjust).not.toHaveBeenCalled();
  });

  it('uses the caller-provided code instead of generating one when present', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await service.confirm(context, {
      warehouseId: 'wh-1',
      items: [{ name: 'X', code: 'MI-SKU', salePrice: 100 }],
    });

    expect(deps.products.generateCodeFromName).not.toHaveBeenCalled();
    expect(deps.products.create).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ code: 'MI-SKU' }),
    );
  });

  it('keeps importing the rest of the batch when one item fails (a bad row does not sink the whole import)', async () => {
    const deps = makeDeps();
    deps.products.create
      .mockRejectedValueOnce(new Error('Ya existe un producto con ese SKU.'))
      .mockResolvedValueOnce({ id: 'product-2', code: 'OK' });
    const service = makeService(deps);

    const result = await service.confirm(context, {
      warehouseId: 'wh-1',
      items: [
        { name: 'Falla', salePrice: 100 },
        { name: 'Funciona', salePrice: 200 },
      ],
    });

    expect(result.created).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({ name: 'Falla', status: 'ERROR' }),
    );
    expect(result.items[1]).toEqual(
      expect.objectContaining({ name: 'Funciona', status: 'CREATED' }),
    );
  });

  it('reports CREATED (not ERROR) with a warning when the product was made but stock.adjust fails afterward — the product is real, ERROR would misreport it as never having happened', async () => {
    const deps = makeDeps();
    deps.stock.adjust.mockRejectedValue(new Error('Depósito no encontrado.'));
    const service = makeService(deps);

    const result = await service.confirm(context, {
      warehouseId: 'wh-inexistente',
      items: [{ name: 'X', salePrice: 100, stock: 5 }],
    });

    expect(result.created).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.items[0]).toEqual({
      name: 'X',
      status: 'CREATED',
      productId: 'product-1',
      variantId: undefined,
      error: 'Stock no cargado: Depósito no encontrado.',
    });
  });

  it('always creates/adjusts through the same authenticated context — never a company id from the request body', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await service.confirm(context, {
      warehouseId: 'wh-1',
      items: [{ name: 'X', salePrice: 100, stock: 1 }],
    });

    expect(deps.products.create.mock.calls[0][0]).toBe(context);
    expect(deps.stock.adjust.mock.calls[0][0]).toBe(context);
  });
});
