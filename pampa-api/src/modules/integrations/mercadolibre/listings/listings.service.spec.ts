import { NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../../../../database/prisma.service';
import type { SecurityContext } from '../../../auth/types/security-context';
import { MercadoLibreLinkConflictError } from '../mercadolibre.errors';
import { MercadoLibreListingsService } from './listings.service';
import type { MercadoLibreListingRepository } from './listings.repository';

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

function buildService(overrides: {
  listing?: { id: string } | null;
  product?: { id: string } | null;
  existingLink?: { product_id: string } | null;
}) {
  const repository = {
    findListingForCompany: jest.fn().mockResolvedValue(
      overrides.listing === undefined ? { id: 'listing-a' } : overrides.listing,
    ),
    findLinkByListing: jest
      .fn()
      .mockResolvedValue(overrides.existingLink ?? null),
    createLink: jest.fn().mockResolvedValue({ id: 'link-a' }),
    unlink: jest.fn().mockResolvedValue(undefined),
  } as unknown as MercadoLibreListingRepository;

  const prisma = {
    product: {
      findFirst: jest.fn().mockResolvedValue(
        overrides.product === undefined ? { id: 'product-a' } : overrides.product,
      ),
    },
  } as unknown as PrismaService;

  return { service: new MercadoLibreListingsService(repository, prisma), repository, prisma };
}

describe('MercadoLibreListingsService', () => {
  it('creates a link when the listing has none yet', async () => {
    const { service, repository } = buildService({ existingLink: null });
    await service.link(context, 'listing-a', 'product-a');
    expect(repository.createLink).toHaveBeenCalledWith(
      'company-a',
      'listing-a',
      'product-a',
    );
  });

  it('throws NotFoundException when the listing does not belong to the company', async () => {
    const { service } = buildService({ listing: null });
    await expect(service.link(context, 'listing-x', 'product-a')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws NotFoundException when the product does not belong to the company', async () => {
    const { service } = buildService({ product: null });
    await expect(service.link(context, 'listing-a', 'product-x')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('is idempotent when re-linking the same product', async () => {
    const { service, repository } = buildService({
      existingLink: { product_id: 'product-a' },
    });
    const result = await service.link(context, 'listing-a', 'product-a');
    expect(result).toEqual({ product_id: 'product-a' });
    expect(repository.createLink).not.toHaveBeenCalled();
  });

  it('throws MercadoLibreLinkConflictError when linking a different product', async () => {
    const { service, repository } = buildService({
      existingLink: { product_id: 'product-other' },
    });
    await expect(service.link(context, 'listing-a', 'product-a')).rejects.toThrow(
      MercadoLibreLinkConflictError,
    );
    expect(repository.createLink).not.toHaveBeenCalled();
  });

  it('unlinks an existing listing', async () => {
    const { service, repository } = buildService({});
    await service.unlink(context, 'listing-a');
    expect(repository.unlink).toHaveBeenCalledWith('company-a', 'listing-a');
  });

  it('throws NotFoundException when unlinking a listing from another company', async () => {
    const { service } = buildService({ listing: null });
    await expect(service.unlink(context, 'listing-x')).rejects.toThrow(
      NotFoundException,
    );
  });
});
