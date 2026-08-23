import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import { StockRepository } from '../../inventory/stock/repositories/stock.repository';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { CreateSaleDto, SaleItemInputDto } from './dto/create-sale.dto';
import { SaleRepository } from './repositories/sale.repository';

@Injectable()
export class SalesService {
  constructor(
    private readonly repository: SaleRepository,
    private readonly stockRepository: StockRepository,
  ) {}

  findAll(
    context: SecurityContext,
    filters?: { status?: string; branchId?: string; clientId?: string },
  ) {
    return this.repository.findAll(context.companyId, filters);
  }

  async findOne(context: SecurityContext, id: string) {
    const sale = await this.repository.findById(context.companyId, id);
    if (!sale) throw new NotFoundException('Venta no encontrada.');
    return sale;
  }

  create(context: SecurityContext, input: CreateSaleDto) {
    return this.stockRepository.transaction((tx) =>
      this.createTx(tx, context, input),
    );
  }

  /**
   * Same DRAFT-sale creation as `create()`, but composable inside a caller's
   * own transaction (e.g. CatalogOrdersService.accept(), which needs the
   * client lookup/creation, this sale, and the catalog_order status update
   * to commit or roll back together). Never call this outside a transaction
   * opened by `stockRepository.transaction()`.
   */
  async createTx(
    tx: Parameters<SaleRepository['findProducts']>[0],
    context: SecurityContext,
    input: CreateSaleDto,
  ) {
    await this.assertResources(
      tx,
      context.companyId,
      input.branchId,
      input.warehouseId,
      input.clientId,
    );
    const calculation = await this.calculate(
      tx,
      context.companyId,
      input.items,
    );
    return this.repository.create(tx, {
      companyId: context.companyId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      clientId: input.clientId,
      userId: context.userId,
      notes: this.optional(input.notes),
      ...calculation,
    });
  }

  async confirm(context: SecurityContext, id: string) {
    return this.stockRepository.transaction(async (tx) => {
      const sale = await this.repository.findByIdTx(tx, context.companyId, id);
      if (!sale) throw new NotFoundException('Venta no encontrada.');
      if (sale.status !== 'DRAFT') {
        throw new ConflictException('La venta ya fue procesada.');
      }
      await this.assertResources(
        tx,
        context.companyId,
        sale.branch_id,
        sale.warehouse_id,
        sale.client_id ?? undefined,
      );
      const calculation = await this.calculate(
        tx,
        context.companyId,
        sale.sale_item.map((item) => ({
          productId: item.product_id,
          variantId: item.variant_id ?? undefined,
          quantity: item.quantity.toNumber(),
          discountPercent: item.discount_percent.toNumber(),
        })),
        sale.sale_item.map((item) => item.id),
      );

      for (const item of calculation.items) {
        if (!item.tracksStock) continue;
        await this.stockRepository.lockStock(
          tx,
          context.companyId,
          sale.warehouse_id,
          item.productId,
          item.variantId,
        );
        const stock = await this.stockRepository.upsertStock(
          tx,
          context.companyId,
          sale.warehouse_id,
          item.productId,
          item.variantId,
        );
        const nextQuantity = stock.quantity.minus(item.quantity);
        if (nextQuantity.isNegative()) {
          throw new ConflictException(
            `Stock insuficiente para ${item.productName}.`,
          );
        }
        await this.stockRepository.updateQuantity(tx, stock.id, nextQuantity);
        await this.stockRepository.createMovement(tx, {
          companyId: context.companyId,
          productId: item.productId,
          variantId: item.variantId,
          warehouseId: sale.warehouse_id,
          movementType: 'SALE',
          quantity: item.quantity,
          referenceCode: `SALE-${sale.id}`,
          origin: 'SALE',
          observations: `Confirmación de venta VTA-${sale.sale_number.toString().padStart(8, '0')}`,
          actorUserId: context.userId,
        });
      }

      await this.repository.confirm(
        tx,
        context.companyId,
        sale.id,
        calculation,
        calculation.items.map((item) => ({
          id: item.id!,
          productName: item.productName,
          productCode: item.productCode,
          variantLabel: item.variantLabel,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discountPercent: item.discountPercent,
          subtotal: item.subtotal,
          total: item.total,
        })),
      );
      const company = await this.repository.companySnapshot(
        tx,
        context.companyId,
      );
      if (!company) throw new NotFoundException('Empresa no encontrada.');
      const internalNumber = `INT-VTA-${sale.sale_number.toString().padStart(8, '0')}`;
      await this.repository.createInvoice(tx, {
        companyId: context.companyId,
        saleId: sale.id,
        internalNumber,
        companySnapshot: this.json(company),
        clientSnapshot: sale.client ? this.json(sale.client) : undefined,
        itemsSnapshot: this.json(
          calculation.items.map((item) => ({
            productId: item.productId,
            code: item.productCode,
            name: item.productName,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            taxRate: item.taxRate.toString(),
            discountPercent: item.discountPercent.toString(),
            subtotal: item.subtotal.toString(),
            total: item.total.toString(),
          })),
        ),
        totalsSnapshot: this.json({
          subtotal: calculation.subtotal.toString(),
          taxTotal: calculation.taxTotal.toString(),
          discountTotal: calculation.discountTotal.toString(),
          total: calculation.total.toString(),
        }),
      });
      const confirmed = await this.repository.findByIdTx(
        tx,
        context.companyId,
        sale.id,
      );
      if (!confirmed) throw new NotFoundException('Venta no encontrada.');
      return confirmed;
    });
  }

  cancel(context: SecurityContext, id: string, input: CancelSaleDto) {
    return this.stockRepository.transaction(async (tx) => {
      const sale = await this.repository.findByIdTx(tx, context.companyId, id);
      if (!sale) throw new NotFoundException('Venta no encontrada.');
      if (sale.status === 'CANCELLED') {
        throw new ConflictException('La venta ya está cancelada.');
      }
      if (sale.status === 'DRAFT') {
        throw new ConflictException(
          'Un borrador no se cancela como venta confirmada.',
        );
      }
      if (sale.payment.some((payment) => payment.status === 'COMPLETED')) {
        throw new ConflictException(
          'Cancelá o reembolsá los pagos antes de cancelar la venta.',
        );
      }
      for (const item of sale.sale_item) {
        if (!item.product.tracks_stock) continue;
        await this.stockRepository.lockStock(
          tx,
          context.companyId,
          sale.warehouse_id,
          item.product_id,
          item.variant_id ?? undefined,
        );
        const stock = await this.stockRepository.upsertStock(
          tx,
          context.companyId,
          sale.warehouse_id,
          item.product_id,
          item.variant_id ?? undefined,
        );
        await this.stockRepository.updateQuantity(
          tx,
          stock.id,
          stock.quantity.plus(item.quantity),
        );
        await this.stockRepository.createMovement(tx, {
          companyId: context.companyId,
          productId: item.product_id,
          variantId: item.variant_id ?? undefined,
          warehouseId: sale.warehouse_id,
          movementType: 'SALE_CANCEL',
          quantity: item.quantity,
          referenceCode: `SALE-CANCEL-${sale.id}`,
          origin: 'SALE_CANCEL',
          observations: this.required(input.reason),
          actorUserId: context.userId,
        });
      }
      await this.repository.cancel(
        tx,
        sale.id,
        context.userId,
        this.required(input.reason),
      );
      return this.repository.findByIdTx(tx, context.companyId, sale.id);
    });
  }

  private async calculate(
    tx: Parameters<SaleRepository['findProducts']>[0],
    companyId: string,
    inputs: SaleItemInputDto[],
    existingIds?: string[],
  ) {
    const uniqueKeys = new Set(
      inputs.map((item) => `${item.productId}:${item.variantId ?? ''}`),
    );
    if (uniqueKeys.size !== inputs.length) {
      throw new ConflictException(
        'Cada producto (o variante) debe aparecer una sola vez en la venta.',
      );
    }
    const uniqueProductIds = [...new Set(inputs.map((item) => item.productId))];
    const products = await this.repository.findProducts(
      tx,
      companyId,
      uniqueProductIds,
    );
    if (products.length !== uniqueProductIds.length) {
      throw new NotFoundException('Uno o más productos no están disponibles.');
    }
    const byId = new Map(products.map((product) => [product.id, product]));
    const items = inputs.map((input, index) => {
      const product = byId.get(input.productId)!;
      const variant = input.variantId
        ? product.product_variant.find((v) => v.id === input.variantId)
        : undefined;
      if (input.variantId && !variant) {
        throw new NotFoundException(
          `La variante seleccionada para ${product.name} ya no está disponible.`,
        );
      }
      const quantity = new Prisma.Decimal(input.quantity);
      const unitPrice = product.sale_price;
      if (unitPrice.lessThanOrEqualTo(0)) {
        throw new ConflictException(
          `${product.name} no tiene un precio de venta válido.`,
        );
      }
      const discountPercent = new Prisma.Decimal(input.discountPercent ?? 0);
      const gross = this.money(unitPrice.mul(quantity));
      const discount = this.money(gross.mul(discountPercent).div(100));
      const subtotal = this.money(gross.minus(discount));
      const tax = this.money(subtotal.mul(product.tax_rate).div(100));
      return {
        id: existingIds?.[index],
        productId: product.id,
        variantId: variant?.id,
        variantLabel: variant?.label,
        lineNumber: index + 1,
        productName: product.name,
        productCode: product.code,
        quantity,
        unitPrice,
        taxRate: product.tax_rate,
        discountPercent,
        discount,
        subtotal,
        total: this.money(subtotal.plus(tax)),
        tax,
        tracksStock: product.tracks_stock,
      };
    });
    return {
      items,
      subtotal: items.reduce(
        (total, item) => total.plus(item.subtotal),
        new Prisma.Decimal(0),
      ),
      taxTotal: items.reduce(
        (total, item) => total.plus(item.tax),
        new Prisma.Decimal(0),
      ),
      discountTotal: items.reduce(
        (total, item) => total.plus(item.discount),
        new Prisma.Decimal(0),
      ),
      total: items.reduce(
        (total, item) => total.plus(item.total),
        new Prisma.Decimal(0),
      ),
    };
  }

  private async assertResources(
    tx: Parameters<SaleRepository['findResources']>[0],
    companyId: string,
    branchId: string,
    warehouseId: string,
    clientId?: string,
  ) {
    const [branch, warehouse, client] = await this.repository.findResources(
      tx,
      companyId,
      branchId,
      warehouseId,
      clientId,
    );
    if (!branch) throw new NotFoundException('Sucursal no encontrada.');
    if (!warehouse) throw new NotFoundException('Depósito no encontrado.');
    if (!client) throw new NotFoundException('Cliente no encontrado.');
  }

  private money(value: Prisma.Decimal) {
    return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private optional(value?: string) {
    const normalized = value?.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  private required(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private json(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
