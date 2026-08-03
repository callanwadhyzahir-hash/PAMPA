import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateProductDto } from './create-product.dto';

describe('CreateProductDto', () => {
  function input(salePrice: number) {
    return plainToInstance(CreateProductDto, {
      code: 'SKU-1',
      name: 'Producto',
      cost: 0,
      salePrice,
    });
  }

  it('rejects a zero sale price', async () => {
    const errors = await validate(input(0));

    expect(errors.some((error) => error.property === 'salePrice')).toBe(true);
  });

  it('accepts a positive sale price', async () => {
    const errors = await validate(input(0.01));

    expect(errors).toHaveLength(0);
  });
});
