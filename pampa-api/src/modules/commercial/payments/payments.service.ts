import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { SecurityContext } from '../../auth/types/security-context';
import { StockRepository } from '../../inventory/stock/repositories/stock.repository';
import { CancelPaymentDto, CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentRepository } from './repositories/payment.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly stockRepository: StockRepository,
  ) {}

  findAll(
    context: SecurityContext,
    filters?: { status?: string; method?: string },
  ) {
    return this.repository.findAll(context.companyId, filters);
  }

  async findOne(context: SecurityContext, id: string) {
    const payment = await this.repository.findById(context.companyId, id);
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    return payment;
  }

  create(context: SecurityContext, saleId: string, input: CreatePaymentDto) {
    return this.stockRepository.transaction(async (tx) => {
      await this.repository.lockSale(tx, context.companyId, saleId);
      const sale = await this.repository.findSale(
        tx,
        context.companyId,
        saleId,
      );
      if (!sale) throw new NotFoundException('Venta no encontrada.');
      if (!['CONFIRMED', 'PARTIALLY_PAID'].includes(sale.status)) {
        throw new ConflictException('La venta no admite nuevos pagos.');
      }
      const items = input.items.map((item) => ({
        method: item.method,
        amount: this.money(new Prisma.Decimal(item.amount)),
        reference: this.optional(item.reference),
      }));
      const total = items.reduce(
        (sum, item) => sum.plus(item.amount),
        new Prisma.Decimal(0),
      );
      const alreadyPaid = sale.payment.reduce(
        (sum, payment) => sum.plus(payment.total),
        new Prisma.Decimal(0),
      );
      const balance = sale.total.minus(alreadyPaid);
      if (total.greaterThan(balance)) {
        throw new ConflictException('El pago supera el saldo de la venta.');
      }
      const payment = await this.repository.create(tx, {
        companyId: context.companyId,
        saleId,
        userId: context.userId,
        total,
        notes: this.optional(input.notes),
        items,
      });
      const newPaid = alreadyPaid.plus(total);
      await this.repository.updateSaleStatus(
        tx,
        saleId,
        newPaid.equals(sale.total) ? 'PAID' : 'PARTIALLY_PAID',
      );
      await this.repository.recalculateClientBalance(
        tx,
        context.companyId,
        sale.client_id,
      );
      return payment;
    });
  }

  reverse(
    context: SecurityContext,
    id: string,
    input: CancelPaymentDto,
    status: 'CANCELLED' | 'REFUNDED',
  ) {
    return this.stockRepository.transaction(async (tx) => {
      const current = await this.repository.findByIdTx(
        tx,
        context.companyId,
        id,
      );
      if (!current) throw new NotFoundException('Pago no encontrado.');
      await this.repository.lockSale(tx, context.companyId, current.sale_id);
      const sale = await this.repository.findSale(
        tx,
        context.companyId,
        current.sale_id,
      );
      if (!sale) throw new NotFoundException('Venta no encontrada.');
      const payment = sale.payment.find((entry) => entry.id === id);
      if (!payment) {
        throw new ConflictException('El pago ya fue revertido.');
      }
      const reversed = await this.repository.cancel(
        tx,
        id,
        status,
        this.required(input.reason),
      );
      const paidAfter = sale.payment
        .filter((entry) => entry.id !== id)
        .reduce((sum, entry) => sum.plus(entry.total), new Prisma.Decimal(0));
      await this.repository.updateSaleStatus(
        tx,
        sale.id,
        paidAfter.isZero()
          ? 'CONFIRMED'
          : paidAfter.equals(sale.total)
            ? 'PAID'
            : 'PARTIALLY_PAID',
      );
      await this.repository.recalculateClientBalance(
        tx,
        context.companyId,
        sale.client_id,
      );
      return reversed;
    });
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
}
