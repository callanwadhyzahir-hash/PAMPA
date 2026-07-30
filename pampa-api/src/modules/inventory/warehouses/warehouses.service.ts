import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseRepository } from './repositories/warehouse.repository';

@Injectable()
export class WarehousesService {
  constructor(private readonly repository: WarehouseRepository) {}

  async findAll(context: SecurityContext, branchId?: string) {
    const warehouses = await this.repository.findAll(
      context.companyId,
      branchId,
    );
    return warehouses.map((warehouse) => this.withSummary(warehouse));
  }

  async findOne(context: SecurityContext, id: string) {
    const warehouse = await this.repository.findById(context.companyId, id);
    if (!warehouse) throw new NotFoundException('Depósito no encontrado.');
    return this.withSummary(warehouse);
  }

  async create(context: SecurityContext, input: CreateWarehouseDto) {
    const code = this.normalizeCode(input.code);
    await this.assertBranch(context.companyId, input.branchId);
    await this.assertUniqueCode(context.companyId, code);
    if (
      input.isMain &&
      (await this.repository.findActiveMain(input.branchId))
    ) {
      throw new ConflictException(
        'La sucursal ya tiene un depósito principal activo.',
      );
    }
    try {
      const warehouse = await this.repository.create(context.companyId, {
        branchId: input.branchId,
        name: this.normalizeText(input.name),
        code,
        description: this.normalizeOptional(input.description),
        isMain: input.isMain ?? false,
      });
      return this.withSummary(warehouse);
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async update(
    context: SecurityContext,
    id: string,
    input: UpdateWarehouseDto,
  ) {
    const current = await this.findOne(context, id);
    await this.assertBranch(context.companyId, input.branchId);
    const code =
      input.code === undefined ? undefined : this.normalizeCode(input.code);
    if (code) await this.assertUniqueCode(context.companyId, code, id);
    const effectiveBranchId = input.branchId ?? current.branch_id;
    if (
      input.isMain &&
      (await this.repository.findActiveMain(effectiveBranchId, id))
    ) {
      throw new ConflictException(
        'La sucursal ya tiene un depósito principal activo.',
      );
    }
    if (current.is_main && input.isActive === false) {
      throw new ConflictException(
        'Marcá primero otro depósito activo como principal.',
      );
    }
    try {
      const warehouse = await this.repository.update(context.companyId, id, {
        branchId: input.branchId,
        name:
          input.name === undefined ? undefined : this.normalizeText(input.name),
        code,
        description:
          input.description === undefined
            ? undefined
            : (this.normalizeOptional(input.description) ?? null),
        isMain: input.isMain,
        isActive: input.isActive,
      });
      if (!warehouse) throw new NotFoundException('Depósito no encontrado.');
      return this.withSummary(warehouse);
    } catch (error) {
      this.mapConstraintError(error);
    }
  }

  async deactivate(context: SecurityContext, id: string) {
    const result = await this.repository.deactivate(context.companyId, id);
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Depósito no encontrado.');
    }
    if (result.status === 'HAS_STOCK') {
      throw new ConflictException(
        'No se puede desactivar un depósito con stock disponible.',
      );
    }
    return result;
  }

  private async assertBranch(companyId: string, branchId?: string) {
    if (
      branchId &&
      !(await this.repository.findActiveBranch(companyId, branchId))
    ) {
      throw new NotFoundException('Sucursal no encontrada.');
    }
  }

  private async assertUniqueCode(
    companyId: string,
    code: string,
    excludeId?: string,
  ) {
    if (await this.repository.findByCode(companyId, code, excludeId)) {
      throw new ConflictException(
        'Ya existe un depósito con ese código en la empresa.',
      );
    }
  }

  private normalizeText(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeOptional(value?: string) {
    const normalized = value?.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  private normalizeCode(value: string) {
    return this.normalizeText(value).toLocaleUpperCase();
  }

  private withSummary<
    T extends {
      stock: Array<{ quantity: Prisma.Decimal; product_id: string }>;
    },
  >(warehouse: T) {
    return {
      ...warehouse,
      product_count: new Set(warehouse.stock.map((row) => row.product_id)).size,
      stored_units: warehouse.stock.reduce(
        (total, row) => total.plus(row.quantity),
        new Prisma.Decimal(0),
      ),
    };
  }

  private mapConstraintError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'El código o depósito principal entra en conflicto.',
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      throw new NotFoundException('Sucursal no encontrada.');
    }
    throw error;
  }
}
