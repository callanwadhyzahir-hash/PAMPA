import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../../auth/types/security-context';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariantRepository } from './repositories/product-variant.repository';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly repository: ProductVariantRepository) {}

  async findAll(context: SecurityContext, productId: string) {
    await this.assertProduct(context.companyId, productId);
    return this.repository.findAll(context.companyId, productId);
  }

  async create(
    context: SecurityContext,
    productId: string,
    input: CreateProductVariantDto,
  ) {
    await this.assertProduct(context.companyId, productId);
    const label = this.normalize(input.label);
    await this.assertUnique(context.companyId, productId, label);

    try {
      return await this.repository.create(context.companyId, productId, {
        label,
        skuSuffix: this.normalizeOptional(input.skuSuffix),
        sortOrder: input.sortOrder ?? 0,
      });
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async update(
    context: SecurityContext,
    productId: string,
    id: string,
    input: UpdateProductVariantDto,
  ) {
    await this.assertProduct(context.companyId, productId);
    const label =
      input.label === undefined ? undefined : this.normalize(input.label);
    if (label) await this.assertUnique(context.companyId, productId, label, id);

    try {
      const variant = await this.repository.update(context.companyId, id, {
        label,
        skuSuffix:
          input.skuSuffix === undefined
            ? undefined
            : (this.normalizeOptional(input.skuSuffix) ?? null),
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      });
      if (!variant) throw new NotFoundException('Variante no encontrada.');
      return variant;
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async remove(context: SecurityContext, productId: string, id: string) {
    await this.assertProduct(context.companyId, productId);
    const result = await this.repository.deactivateOrDelete(
      context.companyId,
      id,
    );
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Variante no encontrada.');
    }
    return result;
  }

  private async assertProduct(companyId: string, productId: string) {
    const product = await this.repository.findProductRef(
      companyId,
      productId,
    );
    if (!product) throw new NotFoundException('Producto no encontrado.');
  }

  private normalize(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeOptional(value?: string) {
    const normalized = value?.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  private async assertUnique(
    companyId: string,
    productId: string,
    label: string,
    excludeId?: string,
  ) {
    if (
      await this.repository.findByLabel(companyId, productId, label, excludeId)
    ) {
      throw new ConflictException(
        'Ya existe una variante con esa etiqueta en este producto.',
      );
    }
  }

  private mapConstraintError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Ya existe una variante con esa etiqueta en este producto.',
      );
    }
    throw error;
  }
}
