import { Injectable } from '@nestjs/common';

import type { SecurityContext } from '../../auth/types/security-context';
import type { AiExtractedProduct } from '../../ai/gateway/ai-extraction.types';
import { AiGatewayService } from '../../ai/gateway/ai-gateway.service';
import { ProductCategoriesService } from '../../catalog/product-categories/product-categories.service';
import { ProductsService } from '../../catalog/products/products.service';
import { ProductVariantsService } from '../../catalog/products/variants/product-variants.service';
import { StockService } from '../stock/stock.service';
import type {
  ConfirmImportDto,
  ConfirmImportItemDto,
} from './dto/confirm-import.dto';
import type {
  SmartImportConfirmResult,
  SmartImportConfirmResultItem,
  SmartImportPreview,
  SmartImportPreviewItem,
  SmartImportWarning,
} from './smart-import.types';

@Injectable()
export class SmartImportService {
  constructor(
    private readonly gateway: AiGatewayService,
    private readonly products: ProductsService,
    private readonly variants: ProductVariantsService,
    private readonly categories: ProductCategoriesService,
    private readonly stock: StockService,
  ) {}

  async extractFromText(
    context: SecurityContext,
    text: string,
  ): Promise<SmartImportPreview> {
    return this.extract(context, { text });
  }

  async extractFromImage(
    context: SecurityContext,
    image: { mimeType: string; dataBase64: string },
    text?: string,
  ): Promise<SmartImportPreview> {
    return this.extract(context, { text, image });
  }

  async confirm(
    context: SecurityContext,
    input: ConfirmImportDto,
  ): Promise<SmartImportConfirmResult> {
    const results: SmartImportConfirmResultItem[] = [];
    // Sequential, not Promise.all: each item does its own product-code
    // generation (a read-then-write uniqueness check) — running them
    // concurrently would race the same "is this code taken" read across
    // items that happen to normalize to the same base name.
    for (const item of input.items) {
      results.push(await this.confirmOne(context, input.warehouseId, item));
    }
    return {
      created: results.filter((r) => r.status === 'CREATED').length,
      failed: results.filter((r) => r.status === 'ERROR').length,
      items: results,
    };
  }

  /**
   * Product creation is the only step whose failure means nothing was
   * persisted (status ERROR, created:false). Once the product exists,
   * every later step (variant, stock) is best-effort and reported as a
   * warning on an otherwise CREATED row — the alternative (calling the
   * whole item ERROR after it already added a real product to the
   * inventory) would misreport what actually happened to the merchant.
   */
  private async confirmOne(
    context: SecurityContext,
    warehouseId: string,
    item: ConfirmImportItemDto,
  ): Promise<SmartImportConfirmResultItem> {
    let product: { id: string };
    try {
      const code =
        item.code ??
        (await this.products.generateCodeFromName(context, item.name));
      product = await this.products.create(context, {
        code,
        barcode: item.barcode,
        name: item.name,
        description: item.description,
        categoryId: item.categoryId,
        cost: 0,
        salePrice: item.salePrice,
        tracksStock: true,
        isActive: true,
      });
    } catch (error) {
      return { name: item.name, status: 'ERROR', error: errorMessageOf(error) };
    }

    const warnings: string[] = [];
    let variantId: string | undefined;
    if (item.variantLabel) {
      try {
        const variant = await this.variants.create(context, product.id, {
          label: item.variantLabel,
        });
        variantId = variant?.id;
      } catch (error) {
        warnings.push(`Variante no creada: ${errorMessageOf(error)}`);
      }
    }

    if (item.stock && item.stock > 0) {
      try {
        await this.stock.adjust(context, {
          productId: product.id,
          variantId,
          warehouseId,
          movementType: 'INITIAL',
          quantity: item.stock,
          reason: 'Carga inteligente de stock (IA)',
        });
      } catch (error) {
        warnings.push(`Stock no cargado: ${errorMessageOf(error)}`);
      }
    }

    return {
      name: item.name,
      status: 'CREATED',
      productId: product.id,
      variantId,
      ...(warnings.length > 0 ? { error: warnings.join(' ') } : {}),
    };
  }

  private async extract(
    context: SecurityContext,
    input: { text?: string; image?: { mimeType: string; dataBase64: string } },
  ): Promise<SmartImportPreview> {
    const extraction = await this.gateway.extractProducts(context, input);

    const barcodes = unique(
      extraction.products
        .map((p) => p.barcode)
        .filter((v): v is string => v !== null),
    );
    const names = unique(extraction.products.map((p) => p.name));
    const [duplicateCandidates, existingCategories] = await Promise.all([
      this.products.findDuplicateCandidates(context, { barcodes, names }),
      this.categories.findAll(context),
    ]);

    const items = await Promise.all(
      extraction.products.map(async (product) => {
        const code = await this.products.generateCodeFromName(
          context,
          product.name,
        );
        return this.toPreviewItem(
          product,
          code,
          duplicateCandidates,
          existingCategories,
        );
      }),
    );

    return { items, provider: extraction.provider };
  }

  private toPreviewItem(
    product: AiExtractedProduct,
    code: string,
    duplicateCandidates: Array<{
      id: string;
      code: string;
      barcode: string | null;
      name: string;
    }>,
    existingCategories: Array<{ id: string; name: string }>,
  ): SmartImportPreviewItem {
    const warnings: SmartImportWarning[] = [];

    if (
      product.barcode &&
      duplicateCandidates.some((c) => c.barcode === product.barcode)
    ) {
      warnings.push('DUPLICATE_BARCODE');
    } else if (
      duplicateCandidates.some(
        (c) =>
          normalizeForCompare(c.name) === normalizeForCompare(product.name),
      )
    ) {
      warnings.push('POSSIBLE_DUPLICATE_NAME');
    }
    if (product.price === null) warnings.push('MISSING_PRICE');
    if (product.stock === null) warnings.push('MISSING_STOCK');

    const matchedCategory = product.category
      ? existingCategories.find((c) =>
          categoriesMatch(c.name, product.category!),
        )
      : undefined;
    if (product.category && !matchedCategory)
      warnings.push('CATEGORY_NOT_FOUND');

    const variantLabel =
      [product.size, product.color].filter(Boolean).join(' · ') || null;

    return {
      name: product.name,
      code,
      barcode: product.barcode,
      brand: product.brand,
      category: product.category,
      categoryId: matchedCategory?.id ?? null,
      variantLabel,
      description: product.description,
      price: product.price,
      stock: product.stock,
      warnings,
      status: warnings.length > 0 ? 'WARNING' : 'VALID',
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Error inesperado.';
}

function normalizeForCompare(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function categoriesMatch(existingName: string, extracted: string): boolean {
  const a = normalizeForCompare(existingName);
  const b = normalizeForCompare(extracted);
  return a === b || a.includes(b) || b.includes(a);
}
