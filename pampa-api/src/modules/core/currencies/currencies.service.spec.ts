import { Test, TestingModule } from '@nestjs/testing';

import { CurrencyRepository } from './repositories/currency.repository';
import { CurrenciesService } from './currencies.service';

describe('CurrenciesService', () => {
  let service: CurrenciesService;
  const repository = { findAll: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrenciesService,
        { provide: CurrencyRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<CurrenciesService>(CurrenciesService);
  });

  it('returns active currencies from the repository', async () => {
    const currencies = [
      { id: '11111111-1111-4111-8111-111111111111', code: 'ARS' },
    ];
    repository.findAll.mockResolvedValue(currencies);

    await expect(service.findAll()).resolves.toEqual(currencies);
    expect(repository.findAll).toHaveBeenCalledTimes(1);
  });
});
