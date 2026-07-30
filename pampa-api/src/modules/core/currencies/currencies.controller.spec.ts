import { Test, TestingModule } from '@nestjs/testing';

import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';

describe('CurrenciesController', () => {
  let controller: CurrenciesController;
  const service = { findAll: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrenciesController],
      providers: [{ provide: CurrenciesService, useValue: service }],
    }).compile();

    controller = module.get<CurrenciesController>(CurrenciesController);
  });

  it('delegates currency listing to the service', async () => {
    const currencies = [
      { id: '11111111-1111-4111-8111-111111111111', code: 'ARS' },
    ];
    service.findAll.mockResolvedValue(currencies);

    await expect(controller.findAll()).resolves.toEqual(currencies);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });
});
