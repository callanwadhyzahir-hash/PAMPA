import { Test, TestingModule } from '@nestjs/testing';
import { CitiesService } from './cities.service';
import { CityRepository } from './repositories/city.repository';

describe('CitiesService', () => {
  let service: CitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitiesService,
        { provide: CityRepository, useValue: { findAllActive: jest.fn() } },
      ],
    }).compile();

    service = module.get<CitiesService>(CitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
