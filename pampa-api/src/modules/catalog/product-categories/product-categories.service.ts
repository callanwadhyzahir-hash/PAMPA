import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoryRepository } from './repositories/product-category.repository';

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly repository: ProductCategoryRepository) {}

  findAll(context: SecurityContext, search?: string) {
    return this.repository.findAll(
      context.companyId,
      search ? this.normalizeName(search) : undefined,
    );
  }

  async findOne(context: SecurityContext, id: string) {
    const category = await this.repository.findById(context.companyId, id);
    if (!category) throw new NotFoundException('Categoría no encontrada.');
    return category;
  }

  async create(context: SecurityContext, input: CreateProductCategoryDto) {
    const name = this.normalizeName(input.name);
    await this.assertUnique(context.companyId, name);
    try {
      return await this.repository.create(context.companyId, {
        name,
        description: this.normalizeOptional(input.description),
        isActive: input.isActive ?? true,
      });
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async update(
    context: SecurityContext,
    id: string,
    input: UpdateProductCategoryDto,
  ) {
    await this.findOne(context, id);
    const name =
      input.name === undefined ? undefined : this.normalizeName(input.name);
    if (name) await this.assertUnique(context.companyId, name, id);

    try {
      const category = await this.repository.update(context.companyId, id, {
        name,
        description:
          input.description === undefined
            ? undefined
            : (this.normalizeOptional(input.description) ?? null),
        isActive: input.isActive,
      });
      if (!category) throw new NotFoundException('Categoría no encontrada.');
      return category;
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async remove(context: SecurityContext, id: string) {
    const result = await this.repository.deactivateOrDelete(
      context.companyId,
      id,
    );
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Categoría no encontrada.');
    }
    return result;
  }

  private normalizeName(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeOptional(value?: string) {
    const normalized = value?.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  private async assertUnique(
    companyId: string,
    name: string,
    excludeId?: string,
  ) {
    if (await this.repository.findByName(companyId, name, excludeId)) {
      throw new ConflictException(
        'Ya existe una categoría con ese nombre en la empresa.',
      );
    }
  }

  private mapConstraintError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Ya existe una categoría con ese nombre en la empresa.',
      );
    }
    throw error;
  }
}
