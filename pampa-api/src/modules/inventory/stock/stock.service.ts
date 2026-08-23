import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';

import type { SecurityContext } from '../../auth/types/security-context';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';
import { StockRepository } from './repositories/stock.repository';

const INBOUND_TYPES = new Set(['INITIAL', 'ADJUSTMENT_IN', 'RETURN_IN']);

@Injectable()
export class StockService {
  constructor(private readonly repository: StockRepository) {}

  findAll(
    context: SecurityContext,
    filters?: {
      productId?: string;
      variantId?: string;
      warehouseId?: string;
      lowStock?: boolean;
    },
  ) {
    return this.repository.findAll(context.companyId, filters);
  }

  summary(context: SecurityContext) {
    return this.repository.summary(context.companyId);
  }

  findMovements(
    context: SecurityContext,
    filters?: { productId?: string; variantId?: string; warehouseId?: string },
  ) {
    return this.repository.findMovements(context.companyId, filters);
  }

  async findMovement(context: SecurityContext, id: string) {
    const movement = await this.repository.findMovement(context.companyId, id);
    if (!movement) {
      throw new NotFoundException('Movimiento de stock no encontrado.');
    }
    return movement;
  }

  adjust(context: SecurityContext, input: StockAdjustmentDto) {
    const quantity = new Prisma.Decimal(input.quantity);
    const inbound = INBOUND_TYPES.has(input.movementType);
    return this.repository.transaction(async (tx) => {
      await this.assertResources(
        tx,
        context.companyId,
        input.productId,
        input.warehouseId,
        input.variantId,
      );
      await this.repository.lockStock(
        tx,
        context.companyId,
        input.warehouseId,
        input.productId,
        input.variantId,
      );
      const current = await this.repository.upsertStock(
        tx,
        context.companyId,
        input.warehouseId,
        input.productId,
        input.variantId,
      );
      const nextQuantity = inbound
        ? current.quantity.plus(quantity)
        : current.quantity.minus(quantity);
      if (nextQuantity.isNegative()) {
        throw new ConflictException(
          'Stock insuficiente para realizar el ajuste.',
        );
      }
      const stock = await this.repository.updateQuantity(
        tx,
        current.id,
        nextQuantity,
      );
      const movement = await this.repository.createMovement(tx, {
        companyId: context.companyId,
        productId: input.productId,
        variantId: input.variantId,
        warehouseId: input.warehouseId,
        movementType: input.movementType,
        quantity,
        referenceCode: `ADJ-${randomUUID()}`,
        origin: 'MANUAL',
        observations: this.normalizeReason(input.reason),
        actorUserId: context.userId,
      });
      return { stock, movement };
    });
  }

  transfer(context: SecurityContext, input: StockTransferDto) {
    if (input.sourceWarehouseId === input.targetWarehouseId) {
      throw new BadRequestException(
        'El depósito de origen y destino deben ser diferentes.',
      );
    }
    const quantity = new Prisma.Decimal(input.quantity);
    const referenceCode = `TRF-${randomUUID()}`;
    return this.repository.transaction(async (tx) => {
      await this.assertResources(
        tx,
        context.companyId,
        input.productId,
        input.sourceWarehouseId,
        input.variantId,
      );
      await this.assertResources(
        tx,
        context.companyId,
        input.productId,
        input.targetWarehouseId,
        input.variantId,
      );
      const warehouseIds = [
        input.sourceWarehouseId,
        input.targetWarehouseId,
      ].sort();
      for (const warehouseId of warehouseIds) {
        await this.repository.lockStock(
          tx,
          context.companyId,
          warehouseId,
          input.productId,
          input.variantId,
        );
      }
      const source = await this.repository.upsertStock(
        tx,
        context.companyId,
        input.sourceWarehouseId,
        input.productId,
        input.variantId,
      );
      const target = await this.repository.upsertStock(
        tx,
        context.companyId,
        input.targetWarehouseId,
        input.productId,
        input.variantId,
      );
      const sourceQuantity = source.quantity.minus(quantity);
      if (sourceQuantity.isNegative()) {
        throw new ConflictException(
          'Stock insuficiente en el depósito de origen.',
        );
      }
      const [sourceStock, targetStock] = await Promise.all([
        this.repository.updateQuantity(tx, source.id, sourceQuantity),
        this.repository.updateQuantity(
          tx,
          target.id,
          target.quantity.plus(quantity),
        ),
      ]);
      const observations = this.normalizeReason(input.reason);
      const movementOut = await this.repository.createMovement(tx, {
        companyId: context.companyId,
        productId: input.productId,
        variantId: input.variantId,
        warehouseId: input.sourceWarehouseId,
        movementType: 'TRANSFER_OUT',
        quantity,
        referenceCode,
        origin: 'TRANSFER',
        observations,
        actorUserId: context.userId,
      });
      const movementIn = await this.repository.createMovement(tx, {
        companyId: context.companyId,
        productId: input.productId,
        variantId: input.variantId,
        warehouseId: input.targetWarehouseId,
        movementType: 'TRANSFER_IN',
        quantity,
        referenceCode,
        origin: 'TRANSFER',
        observations,
        actorUserId: context.userId,
      });
      return { sourceStock, targetStock, movementOut, movementIn };
    });
  }

  private async assertResources(
    tx: Parameters<StockRepository['findActiveProduct']>[0],
    companyId: string,
    productId: string,
    warehouseId: string,
    variantId?: string,
  ) {
    const [product, warehouse] = await Promise.all([
      this.repository.findActiveProduct(tx, companyId, productId),
      this.repository.findActiveWarehouse(tx, companyId, warehouseId),
    ]);
    if (!product) {
      throw new NotFoundException(
        'Producto no encontrado o sin control de stock.',
      );
    }
    if (!warehouse) throw new NotFoundException('Depósito no encontrado.');

    if (variantId) {
      const variant = await this.repository.findActiveVariant(
        tx,
        companyId,
        productId,
        variantId,
      );
      if (!variant) throw new NotFoundException('Variante no encontrada.');
    }
  }

  private normalizeReason(reason: string) {
    return reason.trim().replace(/\s+/g, ' ');
  }
}
