import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { firstValueFrom, of } from 'rxjs';

import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  it('serializes nested bigint values without altering Prisma decimals', async () => {
    const interceptor = new ResponseInterceptor();
    const decimal = new Prisma.Decimal('1815.00');
    const handler: CallHandler = {
      handle: () =>
        of({
          sale_number: BigInt(1),
          total: decimal,
          items: [{ line_number: BigInt(1) }],
        }),
    };

    const response = (await firstValueFrom(
      interceptor.intercept({} as ExecutionContext, handler),
    )) as {
      data: {
        sale_number: string;
        total: Prisma.Decimal;
        items: Array<{ line_number: string }>;
      };
    };

    expect(response.data.sale_number).toBe('1');
    expect(response.data.items[0].line_number).toBe('1');
    expect(response.data.total).toBe(decimal);
  });
});
