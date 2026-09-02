import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import type { SecurityContext } from '../../auth/types/security-context';
import { CatalogService } from './catalog.service';
import type { CatalogRepository } from './repositories/catalog.repository';

const context: SecurityContext = {
  userId: 'user-a',
  companyId: 'company-a',
  branchId: null,
  sessionId: 'session-a',
  tokenVersion: 1,
  email: 'owner@example.com',
  roles: ['OWNER'],
  permissions: [],
  isPlatformAdmin: false,
};

describe('CatalogService', () => {
  const repository = {
    findByCompany: jest.fn(),
    findBySlug: jest.fn(),
    findBySlugPublic: jest.fn(),
    existsSlug: jest.fn(),
    findBranch: jest.fn(),
    findWarehouse: jest.fn(),
    upsert: jest.fn(),
    countVisibleProducts: jest.fn(),
  };
  const service = new CatalogService(
    repository as unknown as CatalogRepository,
  );

  const baseInput = {
    branchId: 'branch-a',
    warehouseId: 'warehouse-a',
    slug: 'mi-negocio',
    displayName: 'Mi Negocio',
    isEnabled: true,
    showPrices: true,
    showAvailability: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findBranch.mockResolvedValue({ id: 'branch-a' });
    repository.findWarehouse.mockResolvedValue({ id: 'warehouse-a' });
    repository.existsSlug.mockResolvedValue(false);
    repository.upsert.mockResolvedValue({
      id: 'catalog-a',
      slug: 'mi-negocio',
    });
  });

  it('rejects a branch that does not belong to the company and never upserts', async () => {
    repository.findBranch.mockResolvedValue(null);
    await expect(service.upsert(context, baseInput)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('rejects a warehouse that does not belong to the chosen branch', async () => {
    repository.findWarehouse.mockResolvedValue(null);
    await expect(service.upsert(context, baseInput)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('rejects a slug already taken by another company', async () => {
    repository.existsSlug.mockResolvedValue(true);
    await expect(service.upsert(context, baseInput)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('rejects reserved slugs like "admin" or "api"', async () => {
    await expect(
      service.upsert(context, { ...baseInput, slug: 'admin' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('persists a valid catalog scoped to the company', async () => {
    await service.upsert(context, baseInput);
    expect(repository.upsert).toHaveBeenCalledWith(
      context.companyId,
      expect.objectContaining({ slug: 'mi-negocio', branchId: 'branch-a' }),
    );
  });

  it('strips spaces/dashes from the WhatsApp number before persisting it', async () => {
    await service.upsert(context, {
      ...baseInput,
      whatsapp: '+54 9 11 1234-5678',
    });
    expect(repository.upsert).toHaveBeenCalledWith(
      context.companyId,
      expect.objectContaining({ whatsapp: '5491112345678' }),
    );
  });

  it('rejects a WhatsApp number with too few digits', async () => {
    await expect(
      service.upsert(context, { ...baseInput, whatsapp: '123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('leaves the WhatsApp number unset when omitted', async () => {
    await service.upsert(context, baseInput);
    expect(repository.upsert).toHaveBeenCalledWith(
      context.companyId,
      expect.objectContaining({ whatsapp: undefined }),
    );
  });
});
