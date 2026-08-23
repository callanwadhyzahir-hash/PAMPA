import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ClientRepository } from '../clients/repositories/client.repository';
import { SalesService } from '../sales/sales.service';
import { StockRepository } from '../../inventory/stock/repositories/stock.repository';
import type { SecurityContext } from '../../auth/types/security-context';
import { RejectOrderDto } from './dto/reject-order.dto';
import { CatalogOrderRepository } from './repositories/catalog-order.repository';

@Injectable()
export class CatalogOrdersService {
  constructor(
    private readonly repository: CatalogOrderRepository,
    private readonly clientRepository: ClientRepository,
    private readonly salesService: SalesService,
    private readonly stockRepository: StockRepository,
  ) {}

  findAll(context: SecurityContext, status?: string) {
    return this.repository.findAll(context.companyId, status);
  }

  async findOne(context: SecurityContext, id: string) {
    const order = await this.repository.findById(context.companyId, id);
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    return order;
  }

  async accept(context: SecurityContext, id: string) {
    return this.stockRepository.transaction(async (tx) => {
      // Claim the PENDING->ACCEPTED transition first, atomically, before
      // creating anything. This is what makes double-accept (two admins
      // clicking at once, a retried request) impossible: only the
      // transaction that wins this UPDATE goes on to create a client/sale.
      const claimed = await this.repository.claimForAccept(
        tx,
        context.companyId,
        id,
      );
      if (!claimed) {
        const exists = await this.repository.findByIdTx(
          tx,
          context.companyId,
          id,
        );
        if (!exists) throw new NotFoundException('Pedido no encontrado.');
        throw new ConflictException('El pedido ya fue procesado.');
      }

      const order = await this.repository.findByIdTx(tx, context.companyId, id);
      if (!order) throw new NotFoundException('Pedido no encontrado.');

      const [firstName, ...rest] = order.customer_name.trim().split(/\s+/);
      const lastName = rest.join(' ');
      const existingClient = await this.clientRepository.findByPhoneOrEmailTx(
        tx,
        context.companyId,
        order.customer_phone,
        order.customer_email ?? undefined,
      );
      const client =
        existingClient ??
        (await this.clientRepository.createTx(tx, context.companyId, {
          code: `WEB-${order.order_number.toString()}`,
          first_name: firstName || order.customer_name,
          last_name: lastName || undefined,
          phone: order.customer_phone,
          email: order.customer_email ?? undefined,
          notes: 'Cliente creado automáticamente desde un pedido del catálogo.',
        }));

      const sale = await this.salesService.createTx(tx, context, {
        branchId: order.catalog.branch_id,
        warehouseId: order.catalog.warehouse_id,
        clientId: client.id,
        notes: `Generada desde pedido de catálogo PED-${order.order_number.toString().padStart(8, '0')}.`,
        items: order.catalog_order_item.map((item) => ({
          productId: item.product_id,
          variantId: item.variant_id ?? undefined,
          quantity: item.quantity.toNumber(),
        })),
      });

      await this.repository.linkAcceptedSale(tx, id, {
        clientId: client.id,
        saleId: sale.id,
      });

      return this.repository.findByIdTx(tx, context.companyId, id);
    });
  }

  async reject(context: SecurityContext, id: string, input: RejectOrderDto) {
    return this.stockRepository.transaction(async (tx) => {
      const claimed = await this.repository.claimForReject(
        tx,
        context.companyId,
        id,
        this.required(input.reason),
      );
      if (!claimed) {
        const exists = await this.repository.findByIdTx(
          tx,
          context.companyId,
          id,
        );
        if (!exists) throw new NotFoundException('Pedido no encontrado.');
        throw new ConflictException('El pedido ya fue procesado.');
      }
      return this.repository.findByIdTx(tx, context.companyId, id);
    });
  }

  private required(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }
}
