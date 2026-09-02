import { randomBytes } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductRepository } from './repositories/product.repository';

// Code 128-safe alphabet without visually ambiguous characters (0/O, 1/I).
const BARCODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const BARCODE_NAMESPACE = 'PMP';
const BARCODE_SUFFIX_LENGTH = 12;
const BARCODE_GENERATION_ATTEMPTS = 5;

@Injectable()
export class ProductsService {
  constructor(private readonly repository: ProductRepository) {}

  async findAll(context: SecurityContext, query: ProductQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.findAll(context.companyId, {
      search: this.normalizeOptional(query.search),
      categoryId: query.categoryId,
      isActive: query.isActive,
      page,
      limit,
    });
    return {
      items: result.items.map((product) => this.withStockSummary(product)),
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  async findOne(context: SecurityContext, id: string) {
    const product = await this.repository.findById(context.companyId, id);
    if (!product) throw new NotFoundException('Producto no encontrado.');
    return this.withStockSummary(product);
  }

  async findByBarcode(context: SecurityContext, barcode: string) {
    const normalized = this.normalizeRequired(barcode);
    const product = await this.repository.findByBarcode(
      context.companyId,
      normalized,
    );
    if (!product) throw new NotFoundException('Producto no encontrado.');
    return this.withStockSummary(product);
  }

  async generateBarcode(
    context: SecurityContext,
  ): Promise<{ barcode: string }> {
    for (let attempt = 0; attempt < BARCODE_GENERATION_ATTEMPTS; attempt++) {
      const candidate = this.buildBarcodeCandidate();
      const taken = await this.repository.existsByBarcode(
        context.companyId,
        candidate,
      );
      if (!taken) return { barcode: candidate };
    }
    throw new ConflictException(
      'No se pudo generar un código de barras único. Intentá nuevamente.',
    );
  }

  private buildBarcodeCandidate(): string {
    const bytes = randomBytes(BARCODE_SUFFIX_LENGTH);
    let suffix = '';
    for (let i = 0; i < BARCODE_SUFFIX_LENGTH; i++) {
      suffix += BARCODE_ALPHABET[bytes[i] % BARCODE_ALPHABET.length];
    }
    return `${BARCODE_NAMESPACE}-${suffix}`;
  }

  async create(context: SecurityContext, input: CreateProductDto) {
    const code = this.normalizeCode(input.code);
    const barcode = this.normalizeOptional(input.barcode);
    await this.assertCategory(context.companyId, input.categoryId);
    await this.assertUnique(context.companyId, code, barcode);

    try {
      const product = await this.repository.create(context.companyId, {
        categoryId: input.categoryId,
        code,
        barcode,
        name: this.normalizeRequired(input.name),
        description: this.normalizeOptional(input.description),
        productType: input.productType ?? 'PRODUCT',
        unit: this.normalizeCode(input.unit ?? 'UNIT'),
        cost: new Prisma.Decimal(input.cost),
        salePrice: new Prisma.Decimal(input.salePrice),
        taxRate: new Prisma.Decimal(input.taxRate ?? 21),
        tracksStock: input.tracksStock ?? true,
        isActive: input.isActive ?? true,
        catalogVisible: input.catalogVisible,
        catalogFeatured: input.catalogFeatured,
        catalogPosition: input.catalogPosition,
      });
      return this.withStockSummary(product);
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async update(context: SecurityContext, id: string, input: UpdateProductDto) {
    await this.findOne(context, id);
    await this.assertCategory(context.companyId, input.categoryId);
    const code =
      input.code === undefined ? undefined : this.normalizeCode(input.code);
    const barcode =
      input.barcode === undefined
        ? undefined
        : (this.normalizeOptional(input.barcode) ?? null);
    if (code || barcode) {
      await this.assertUnique(
        context.companyId,
        code,
        barcode ?? undefined,
        id,
      );
    }

    try {
      const product = await this.repository.update(context.companyId, id, {
        categoryId: input.categoryId,
        code,
        barcode,
        name:
          input.name === undefined
            ? undefined
            : this.normalizeRequired(input.name),
        description:
          input.description === undefined
            ? undefined
            : (this.normalizeOptional(input.description) ?? null),
        productType: input.productType,
        unit:
          input.unit === undefined ? undefined : this.normalizeCode(input.unit),
        cost:
          input.cost === undefined ? undefined : new Prisma.Decimal(input.cost),
        salePrice:
          input.salePrice === undefined
            ? undefined
            : new Prisma.Decimal(input.salePrice),
        taxRate:
          input.taxRate === undefined
            ? undefined
            : new Prisma.Decimal(input.taxRate),
        tracksStock: input.tracksStock,
        isActive: input.isActive,
        catalogVisible: input.catalogVisible,
        catalogFeatured: input.catalogFeatured,
        catalogPosition: input.catalogPosition,
      });
      if (!product) throw new NotFoundException('Producto no encontrado.');
      return this.withStockSummary(product);
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async deactivate(context: SecurityContext, id: string) {
    const product = await this.repository.deactivate(context.companyId, id);
    if (!product) throw new NotFoundException('Producto no encontrado.');
    return this.withStockSummary(product);
  }

  async setCatalogVisibility(
    context: SecurityContext,
    productIds: string[],
    visible: boolean,
  ) {
    const uniqueIds = [...new Set(productIds)];
    const updated = await this.repository.setCatalogVisibility(
      context.companyId,
      uniqueIds,
      visible,
    );
    return { updated };
  }

  /** Used by Carga inteligente de stock to flag likely duplicates before import — see ProductRepository.findDuplicateCandidates. */
  findDuplicateCandidates(
    context: SecurityContext,
    input: { barcodes: string[]; names: string[] },
  ) {
    return this.repository.findDuplicateCandidates(
      context.companyId,
      input.barcodes,
      input.names,
    );
  }

  /**
   * Deterministic, human-readable SKU for a Carga inteligente de stock
   * import — no AI call needed to name a product. Derives from the name
   * (uppercased, accents stripped) and appends a numeric suffix only if
   * that base is already taken, checked against the same uniqueness the
   * manual create-product form enforces.
   */
  async generateCodeFromName(
    context: SecurityContext,
    name: string,
  ): Promise<string> {
    const base = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLocaleUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const safeBase = base || 'PROD';
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = attempt === 0 ? safeBase : `${safeBase}-${attempt + 1}`;
      const taken = await this.repository.findByCodeOrBarcode(
        context.companyId,
        candidate,
      );
      if (!taken) return candidate;
    }
    throw new ConflictException(
      'No se pudo generar un código único para el producto. Asigná uno manualmente.',
    );
  }

  async findStock(context: SecurityContext, id: string) {
    await this.findOne(context, id);
    return this.repository.findStock(context.companyId, id);
  }

  async findMovements(context: SecurityContext, id: string) {
    await this.findOne(context, id);
    return this.repository.findMovements(context.companyId, id);
  }

  private async assertCategory(companyId: string, categoryId?: string) {
    if (
      categoryId &&
      !(await this.repository.findActiveCategory(companyId, categoryId))
    ) {
      throw new NotFoundException('Categoría no encontrada.');
    }
  }

  private async assertUnique(
    companyId: string,
    code?: string,
    barcode?: string,
    excludeId?: string,
  ) {
    if (!code && !barcode) return;
    const duplicate = await this.repository.findByCodeOrBarcode(
      companyId,
      code,
      barcode,
      excludeId,
    );
    if (!duplicate) return;
    if (code && duplicate.code.toLocaleUpperCase() === code) {
      throw new ConflictException('Ya existe un producto con ese SKU.');
    }
    throw new ConflictException(
      'Ya existe un producto con ese código de barras.',
    );
  }

  private normalizeRequired(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeOptional(value?: string) {
    const normalized = value?.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  private normalizeCode(value: string) {
    return this.normalizeRequired(value).toLocaleUpperCase();
  }

  private withStockSummary<
    T extends {
      stock: Array<{
        quantity: Prisma.Decimal;
        minimum_quantity: Prisma.Decimal;
      }>;
    },
  >(product: T) {
    const totalStock = product.stock.reduce(
      (total, row) => total.plus(row.quantity),
      new Prisma.Decimal(0),
    );
    const minimumStock = product.stock.reduce(
      (total, row) => total.plus(row.minimum_quantity),
      new Prisma.Decimal(0),
    );
    return {
      ...product,
      total_stock: totalStock,
      minimum_stock: minimumStock,
      low_stock:
        product.stock.length > 0 && totalStock.lessThanOrEqualTo(minimumStock),
    };
  }

  private mapConstraintError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'El SKU o código de barras ya existe en la empresa.',
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new NotFoundException('Categoría no encontrada.');
    }
    throw error;
  }
}
