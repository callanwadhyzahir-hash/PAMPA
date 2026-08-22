import { createHash } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { RateLimitService } from '../auth/rate-limit/rate-limit.service';
import { PrismaService } from '../../database/prisma.service';
import { CatalogRepository } from '../catalog/storefront/repositories/catalog.repository';
import { StorefrontProductQueryDto } from './dto/storefront-product-query.dto';
import { SubmitOrderDto } from './dto/submit-order.dto';
import { StorefrontRepository } from './repositories/storefront.repository';

type Availability = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';

const ORDER_SUBMIT_LIMIT = 5;
const ORDER_SUBMIT_WINDOW_MS = 10 * 60 * 1000;

@Injectable()
export class StorefrontService {
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly repository: StorefrontRepository,
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  async getCatalog(slug: string) {
    const catalog = await this.requireCatalog(slug);
    return {
      slug: catalog.slug,
      displayName: catalog.display_name,
      description: catalog.description,
      logoUrl: catalog.logo_url,
      whatsapp: catalog.whatsapp,
      showPrices: catalog.show_prices,
      showAvailability: catalog.show_availability,
    };
  }

  async listProducts(slug: string, query: StorefrontProductQueryDto) {
    const catalog = await this.requireCatalog(slug);
    const page = query.page ?? 1;
    const limit = query.limit ?? 24;
    const result = await this.repository.findProducts(
      catalog.company_id,
      catalog.warehouse_id,
      { search: query.search, categoryId: query.categoryId, page, limit },
    );
    return {
      items: result.items.map((product) =>
        this.toPublicProduct(
          product,
          catalog.show_prices,
          catalog.show_availability,
        ),
      ),
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  async getProduct(slug: string, productId: string) {
    const catalog = await this.requireCatalog(slug);
    const product = await this.repository.findProduct(
      catalog.company_id,
      catalog.warehouse_id,
      productId,
    );
    if (!product) throw new NotFoundException('Producto no disponible.');
    return this.toPublicProduct(
      product,
      catalog.show_prices,
      catalog.show_availability,
    );
  }

  async listCategories(slug: string) {
    const catalog = await this.requireCatalog(slug);
    return this.repository.findCategories(catalog.company_id);
  }

  async submitOrder(slug: string, input: SubmitOrderDto, clientIp: string) {
    const catalog = await this.requireCatalog(slug);

    await this.rateLimit.consume({
      action: 'catalog_order_submit',
      key: `${slug}:${clientIp}`,
      limit: ORDER_SUBMIT_LIMIT,
      windowMs: ORDER_SUBMIT_WINDOW_MS,
    });

    const uniqueIds = [...new Set(input.items.map((item) => item.productId))];
    if (uniqueIds.length !== input.items.length) {
      throw new ConflictException(
        'Cada producto debe aparecer una sola vez en el pedido.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const products = await this.repository.findOrderableProducts(
        tx,
        catalog.company_id,
        uniqueIds,
      );
      const byId = new Map(products.map((product) => [product.id, product]));
      const missing = uniqueIds.filter((id) => !byId.has(id));
      if (missing.length > 0) {
        throw new ConflictException({
          message:
            'Algunos productos de tu pedido ya no están disponibles. Revisá tu carrito.',
          details: { code: 'ITEMS_UNAVAILABLE', unavailableProductIds: missing },
        });
      }

      const items = input.items.map((input, index) => {
        const product = byId.get(input.productId)!;
        const quantity = new Prisma.Decimal(input.quantity);
        const unitPrice = product.sale_price;
        const subtotal = unitPrice
          .mul(quantity)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        return {
          productId: product.id,
          lineNumber: index + 1,
          productName: product.name,
          productCode: product.code,
          quantity,
          unitPrice,
          subtotal,
        };
      });
      const total = items.reduce(
        (sum, item) => sum.plus(item.subtotal),
        new Prisma.Decimal(0),
      );

      const order = await this.repository.createOrder(tx, {
        companyId: catalog.company_id,
        catalogId: catalog.id,
        customerName: this.required(input.customerName),
        customerPhone: this.required(input.customerPhone),
        customerEmail: this.optional(input.customerEmail)?.toLocaleLowerCase(),
        notes: this.optional(input.notes),
        requesterIpHash: this.hashIp(clientIp),
        subtotal: total,
        total,
        items,
      });

      return {
        id: order.id,
        orderNumber: `PED-${order.order_number.toString().padStart(8, '0')}`,
        status: order.status,
        total: order.total,
        createdAt: order.created_at,
        items: order.catalog_order_item.map((item) => ({
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          subtotal: item.subtotal,
        })),
      };
    });
  }

  private async requireCatalog(slug: string) {
    const catalog = await this.catalogRepository.findBySlugPublic(slug);
    if (!catalog) throw new NotFoundException('Catálogo no disponible.');
    return catalog;
  }

  private toPublicProduct(
    product: {
      id: string;
      name: string;
      description: string | null;
      sale_price: Prisma.Decimal;
      unit: string;
      tracks_stock: boolean;
      image_url: string | null;
      catalog_featured: boolean;
      product_category: { id: string; name: string } | null;
      stock: Array<{
        quantity: Prisma.Decimal;
        minimum_quantity: Prisma.Decimal;
      }>;
    },
    showPrices: boolean,
    showAvailability: boolean,
  ) {
    const availability = this.availability(product);
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      unit: product.unit,
      imageUrl: product.image_url,
      featured: product.catalog_featured,
      category: product.product_category,
      price: showPrices ? product.sale_price : null,
      availability: showAvailability ? availability : null,
      inStock: availability !== 'OUT_OF_STOCK',
    };
  }

  private availability(product: {
    tracks_stock: boolean;
    stock: Array<{
      quantity: Prisma.Decimal;
      minimum_quantity: Prisma.Decimal;
    }>;
  }): Availability {
    if (!product.tracks_stock) return 'AVAILABLE';
    const quantity = product.stock[0]?.quantity ?? new Prisma.Decimal(0);
    const minimum = product.stock[0]?.minimum_quantity ?? new Prisma.Decimal(0);
    if (quantity.lessThanOrEqualTo(0)) return 'OUT_OF_STOCK';
    const lowThreshold = minimum.greaterThan(0)
      ? minimum
      : new Prisma.Decimal(3);
    if (quantity.lessThanOrEqualTo(lowThreshold)) return 'LOW_STOCK';
    return 'AVAILABLE';
  }

  private hashIp(ip: string) {
    return createHash('sha256').update(ip).digest('hex');
  }

  private required(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private optional(value?: string) {
    const normalized = value?.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
  }
}
