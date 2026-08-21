import { NotFoundException } from '@nestjs/common';

import type { SecurityContext } from '../../../auth/types/security-context';
import type { ProductRepository } from '../repositories/product.repository';
import { ProductImageMissingFileError } from './product-image.errors';
import type { ProductImageProcessorService } from './product-image-processor.service';
import type { ProductImageStorageService } from './product-image-storage.service';
import { ProductImagesService } from './product-images.service';

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

const file = { mimetype: 'image/png', buffer: Buffer.from('fake') };

function buildService(overrides?: {
  repository?: Partial<ProductRepository>;
  storage?: Partial<ProductImageStorageService>;
  processor?: Partial<ProductImageProcessorService>;
}) {
  const repository = {
    findImageMeta: jest
      .fn()
      .mockResolvedValue({ id: 'product-a', image_pathname: null }),
    setImage: jest.fn().mockResolvedValue({
      id: 'product-a',
      image_url: 'https://blob.example/new.webp',
    }),
    clearImage: jest.fn().mockResolvedValue(true),
    ...overrides?.repository,
  };
  const storage = {
    buildPathname: jest
      .fn()
      .mockReturnValue('products/company-a/product-a/new.webp'),
    upload: jest.fn().mockResolvedValue({
      url: 'https://blob.example/new.webp',
      pathname: 'products/company-a/product-a/new.webp',
    }),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides?.storage,
  };
  const processor = {
    process: jest.fn().mockResolvedValue({
      buffer: Buffer.from('x'),
      contentType: 'image/webp',
    }),
    ...overrides?.processor,
  };

  const service = new ProductImagesService(
    repository as unknown as ProductRepository,
    storage as unknown as ProductImageStorageService,
    processor,
  );
  return { service, repository, storage, processor };
}

describe('ProductImagesService', () => {
  describe('upload', () => {
    it('rejects when no file was attached, before touching the DB', async () => {
      const { service, repository } = buildService();

      await expect(
        service.upload(context, 'product-a', undefined),
      ).rejects.toBeInstanceOf(ProductImageMissingFileError);
      expect(repository.findImageMeta).not.toHaveBeenCalled();
    });

    it('404s when the product does not exist in the caller company', async () => {
      const { service } = buildService({
        repository: { findImageMeta: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.upload(context, 'product-a', file),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('uploads, persists the URL, and returns it', async () => {
      const { service, repository, storage } = buildService();

      const result = await service.upload(context, 'product-a', file);

      expect(storage.upload).toHaveBeenCalledWith(
        'products/company-a/product-a/new.webp',
        expect.any(Buffer),
        'image/webp',
      );
      expect(repository.setImage).toHaveBeenCalledWith(
        'company-a',
        'product-a',
        {
          imageUrl: 'https://blob.example/new.webp',
          imagePathname: 'products/company-a/product-a/new.webp',
        },
      );
      expect(result).toEqual({
        id: 'product-a',
        imageUrl: 'https://blob.example/new.webp',
      });
    });

    it('deletes the previous blob only after the new one is confirmed in the DB (replace flow)', async () => {
      const { service, repository, storage } = buildService({
        repository: {
          findImageMeta: jest.fn().mockResolvedValue({
            id: 'product-a',
            image_pathname: 'products/company-a/product-a/old.webp',
          }),
        },
      });

      await service.upload(context, 'product-a', file);

      const setImageOrder = (repository.setImage as jest.Mock).mock
        .invocationCallOrder[0];
      const deleteOrder = (storage.delete as jest.Mock).mock
        .invocationCallOrder[0];
      expect(storage.delete).toHaveBeenCalledWith(
        'products/company-a/product-a/old.webp',
      );
      expect(setImageOrder).toBeLessThan(deleteOrder);
    });

    it('does not delete anything when there was no previous image', async () => {
      const { service, storage } = buildService();

      await service.upload(context, 'product-a', file);

      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('rolls back the freshly uploaded blob if the product was deleted concurrently', async () => {
      const { service, storage } = buildService({
        repository: { setImage: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.upload(context, 'product-a', file),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.delete).toHaveBeenCalledWith(
        'products/company-a/product-a/new.webp',
      );
    });
  });

  describe('remove', () => {
    it('404s when the product does not exist in the caller company', async () => {
      const { service } = buildService({
        repository: { findImageMeta: jest.fn().mockResolvedValue(null) },
      });

      await expect(service.remove(context, 'product-a')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('is idempotent when the product has no image', async () => {
      const { service, repository, storage } = buildService();

      const result = await service.remove(context, 'product-a');

      expect(result).toEqual({ id: 'product-a', imageUrl: null });
      expect(repository.clearImage).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('clears the DB row and deletes the blob', async () => {
      const { service, repository, storage } = buildService({
        repository: {
          findImageMeta: jest.fn().mockResolvedValue({
            id: 'product-a',
            image_pathname: 'products/company-a/product-a/old.webp',
          }),
        },
      });

      const result = await service.remove(context, 'product-a');

      expect(repository.clearImage).toHaveBeenCalledWith(
        'company-a',
        'product-a',
      );
      expect(storage.delete).toHaveBeenCalledWith(
        'products/company-a/product-a/old.webp',
      );
      expect(result).toEqual({ id: 'product-a', imageUrl: null });
    });
  });
});
