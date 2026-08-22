import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { CatalogRepository } from '../catalog/storefront/repositories/catalog.repository';
import type { PrismaService } from '../../database/prisma.service';
import type { RateLimitService } from '../auth/rate-limit/rate-limit.service';
import type { StorefrontRepository } from './repositories/storefront.repository';
import { StorefrontService } from './storefront.service';

describe('StorefrontService', () => {
  const tx = {};
  const catalogRepository = {
    findBySlugPublic: jest.fn(),
  };
  const repository = {
    findProducts: jest.fn(),
    findProduct: jest.fn(),
    findCategories: jest.fn(),
    findOrderableProducts: jest.fn(),
    createOrder: jest.fn(),
  };
  const prisma = {
    $transaction: jest.fn((work: (client: unknown) => Promise<unknown>) =>
      work(tx),
    ),
  };
  const rateLimit = { consume: jest.fn().mockResolvedValue(undefined) };

  const service = new StorefrontService(
    catalogRepository as unknown as CatalogRepository,
    repository as unknown as StorefrontRepository,
    prisma as unknown as PrismaService,
    rateLimit as unknown as RateLimitService,
  );

  const catalog = {
    id: 'catalog-a',
    company_id: 'company-a',
    warehouse_id: 'warehouse-a',
    slug: 'mi-negocio',
    display_name: 'Mi Negocio',
    description: null,
    logo_url: null,
    whatsapp: null,
    show_prices: true,
    show_availability: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    catalogRepository.findBySlugPublic.mockResolvedValue(catalog);
  });

  it('returns 404 for a disabled or unknown catalog without leaking which', async () => {
    catalogRepository.findBySlugPublic.mockResolvedValue(null);
    await expect(service.getCatalog('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('availability buckets', () => {
    const buildProduct = (overrides: Record<string, unknown>) => ({
      id: 'product-a',
      name: 'Producto',
      description: null,
      sale_price: new Prisma.Decimal(100),
      unit: 'UNIT',
      tracks_stock: true,
      image_url: null,
      catalog_featured: false,
      catalog_position: 0,
      product_category: null,
      stock: [],
      ...overrides,
    });

    it('marks out of stock when quantity is zero or less', async () => {
      repository.findProduct.mockResolvedValue(
        buildProduct({
          stock: [
            {
              quantity: new Prisma.Decimal(0),
              minimum_quantity: new Prisma.Decimal(0),
            },
          ],
        }),
      );
      const result = await service.getProduct('mi-negocio', 'product-a');
      expect(result.availability).toBe('OUT_OF_STOCK');
      expect(result.inStock).toBe(false);
    });

    it('marks low stock at or below the minimum threshold', async () => {
      repository.findProduct.mockResolvedValue(
        buildProduct({
          stock: [
            {
              quantity: new Prisma.Decimal(2),
              minimum_quantity: new Prisma.Decimal(5),
            },
          ],
        }),
      );
      const result = await service.getProduct('mi-negocio', 'product-a');
      expect(result.availability).toBe('LOW_STOCK');
    });

    it('never exposes stock quantities that were not requested for display', async () => {
      repository.findProduct.mockResolvedValue(
        buildProduct({
          stock: [
            {
              quantity: new Prisma.Decimal(500),
              minimum_quantity: new Prisma.Decimal(0),
            },
          ],
        }),
      );
      const result = await service.getProduct('mi-negocio', 'product-a');
      expect(result).not.toHaveProperty('quantity');
      expect(result).not.toHaveProperty('stock');
      expect(result.availability).toBe('AVAILABLE');
    });

    it('treats non-stock-tracked products (services) as always available', async () => {
      repository.findProduct.mockResolvedValue(
        buildProduct({ tracks_stock: false, stock: [] }),
      );
      const result = await service.getProduct('mi-negocio', 'product-a');
      expect(result.availability).toBe('AVAILABLE');
    });

    it('hides price and availability when the merchant disabled those fields', async () => {
      catalogRepository.findBySlugPublic.mockResolvedValue({
        ...catalog,
        show_prices: false,
        show_availability: false,
      });
      repository.findProduct.mockResolvedValue(
        buildProduct({
          stock: [
            {
              quantity: new Prisma.Decimal(1),
              minimum_quantity: new Prisma.Decimal(0),
            },
          ],
        }),
      );
      const result = await service.getProduct('mi-negocio', 'product-a');
      expect(result.price).toBeNull();
      expect(result.availability).toBeNull();
    });
  });

  describe('submitOrder', () => {
    const submission = {
      customerName: 'Juan Pérez',
      customerPhone: '+5491100000000',
      items: [{ productId: 'product-a', quantity: 2 }],
    };

    it('never trusts a client-sent price — always recomputes from the live product', async () => {
      repository.findOrderableProducts.mockResolvedValue([
        {
          id: 'product-a',
          code: 'P-1',
          name: 'Producto',
          sale_price: new Prisma.Decimal(999),
          unit: 'UNIT',
        },
      ]);
      repository.createOrder.mockResolvedValue({
        id: 'order-a',
        order_number: BigInt(1),
        status: 'PENDING',
        total: new Prisma.Decimal(1998),
        created_at: new Date(),
        catalog_order_item: [],
      });

      await service.submitOrder('mi-negocio', submission, '1.2.3.4');

      expect(repository.createOrder).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          total: new Prisma.Decimal(1998),
          subtotal: new Prisma.Decimal(1998),
        }),
      );
    });

    it('rejects the whole order when a product is no longer visible, without partially creating it', async () => {
      repository.findOrderableProducts.mockResolvedValue([]);
      await expect(
        service.submitOrder('mi-negocio', submission as never, '1.2.3.4'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.createOrder).not.toHaveBeenCalled();
    });

    it('rejects duplicate product lines in the same cart', async () => {
      const duplicated = {
        ...submission,
        items: [
          { productId: 'product-a', quantity: 1 },
          { productId: 'product-a', quantity: 1 },
        ],
      };
      await expect(
        service.submitOrder('mi-negocio', duplicated as never, '1.2.3.4'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.createOrder).not.toHaveBeenCalled();
    });

    it('rate limits repeated submissions from the same IP for the same catalog', async () => {
      rateLimit.consume.mockRejectedValueOnce(new Error('rate limited'));
      await expect(
        service.submitOrder('mi-negocio', submission as never, '1.2.3.4'),
      ).rejects.toThrow('rate limited');
      expect(rateLimit.consume).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'mi-negocio:1.2.3.4' }),
      );
      expect(repository.createOrder).not.toHaveBeenCalled();
    });
  });
});
