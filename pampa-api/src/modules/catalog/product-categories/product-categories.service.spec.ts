import { ConflictException, NotFoundException } from '@nestjs/common';

import type { SecurityContext } from '../../auth/types/security-context';
import { ProductCategoriesService } from './product-categories.service';
import type { ProductCategoryRepository } from './repositories/product-category.repository';

const context: SecurityContext = {
  userId: 'user-a',
  companyId: 'company-a',
  branchId: null,
  sessionId: 'session-a',
  tokenVersion: 1,
  email: 'owner@example.com',
  roles: ['OWNER'],
  permissions: [],
};

const category = {
  id: 'category-a',
  name: 'Herramientas eléctricas',
  description: null,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  _count: { product: 0 },
};

describe('ProductCategoriesService', () => {
  const repository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivateOrDelete: jest.fn(),
  };
  const service = new ProductCategoriesService(
    repository as unknown as ProductCategoryRepository,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findById.mockResolvedValue(category);
    repository.findByName.mockResolvedValue(null);
    repository.create.mockResolvedValue(category);
    repository.update.mockResolvedValue(category);
    repository.deactivateOrDelete.mockResolvedValue({ status: 'DELETED' });
  });

  it('scopes listings to the authenticated company', async () => {
    repository.findAll.mockResolvedValue([category]);

    await service.findAll(context, ' herramientas ');

    expect(repository.findAll).toHaveBeenCalledWith(
      context.companyId,
      'herramientas',
    );
  });

  it('returns 404 for a category outside the tenant', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findOne(context, 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('normalizes whitespace when creating', async () => {
    await service.create(context, {
      name: '  Herramientas   eléctricas ',
      description: '  Uso   profesional ',
    });

    expect(repository.create).toHaveBeenCalledWith(context.companyId, {
      name: 'Herramientas eléctricas',
      description: 'Uso profesional',
      isActive: true,
    });
  });

  it('rejects a case-insensitive duplicate in the tenant', async () => {
    repository.findByName.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(context, { name: 'HERRAMIENTAS ELÉCTRICAS' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('uses tenant-scoped soft-delete/delete behavior', async () => {
    await service.remove(context, category.id);

    expect(repository.deactivateOrDelete).toHaveBeenCalledWith(
      context.companyId,
      category.id,
    );
  });
});
