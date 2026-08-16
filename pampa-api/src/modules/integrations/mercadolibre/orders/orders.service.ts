import { Injectable } from '@nestjs/common';

import type { SecurityContext } from '../../../auth/types/security-context';
import { OrderQueryDto } from './dto/order-query.dto';
import { MercadoLibreOrderRepository } from './orders.repository';

@Injectable()
export class MercadoLibreOrdersService {
  constructor(private readonly repository: MercadoLibreOrderRepository) {}

  async findAll(context: SecurityContext, query: OrderQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.repository.findAll(context.companyId, {
      status: query.status,
      page,
      limit,
    });
    return {
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }
}
