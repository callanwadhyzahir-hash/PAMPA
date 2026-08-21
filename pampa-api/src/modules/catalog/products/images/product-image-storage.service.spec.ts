import type { ConfigService } from '@nestjs/config';
import { del, put } from '@vercel/blob';

import { ProductImageStorageNotConfiguredError } from './product-image.errors';
import { ProductImageStorageService } from './product-image-storage.service';

jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  del: jest.fn(),
}));

function configWith(token: string | undefined): ConfigService {
  return { get: jest.fn().mockReturnValue(token) } as unknown as ConfigService;
}

describe('ProductImageStorageService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('without BLOB_READ_WRITE_TOKEN configured', () => {
    const service = new ProductImageStorageService(configWith(undefined));

    it('reports configured=false', () => {
      expect(service.configured).toBe(false);
    });

    it('throws IMAGE_STORAGE_NOT_CONFIGURED on upload instead of calling Blob', async () => {
      await expect(
        service.upload('products/a/b/c.webp', Buffer.from('x'), 'image/webp'),
      ).rejects.toBeInstanceOf(ProductImageStorageNotConfiguredError);
      expect(put).not.toHaveBeenCalled();
    });

    it('no-ops on delete instead of throwing', async () => {
      await expect(
        service.delete('products/a/b/c.webp'),
      ).resolves.toBeUndefined();
      expect(del).not.toHaveBeenCalled();
    });
  });

  describe('with BLOB_READ_WRITE_TOKEN configured', () => {
    const service = new ProductImageStorageService(configWith('token-123'));

    it('uploads with public access and a fixed pathname (no random suffix)', async () => {
      (put as jest.Mock).mockResolvedValue({
        url: 'https://blob.example/products/a/b/c.webp',
        pathname: 'products/a/b/c.webp',
      });

      const result = await service.upload(
        'products/a/b/c.webp',
        Buffer.from('x'),
        'image/webp',
      );

      expect(put).toHaveBeenCalledWith(
        'products/a/b/c.webp',
        expect.any(Buffer),
        expect.objectContaining({
          access: 'public',
          contentType: 'image/webp',
          token: 'token-123',
          addRandomSuffix: false,
        }),
      );
      expect(result).toEqual({
        url: 'https://blob.example/products/a/b/c.webp',
        pathname: 'products/a/b/c.webp',
      });
    });

    it('swallows delete failures instead of throwing (best-effort cleanup)', async () => {
      (del as jest.Mock).mockRejectedValue(new Error('network error'));

      await expect(
        service.delete('products/a/b/c.webp'),
      ).resolves.toBeUndefined();
    });

    it('builds a pathname namespaced by company and product', () => {
      const pathname = service.buildPathname('company-a', 'product-b');
      expect(pathname).toMatch(
        /^products\/company-a\/product-b\/[0-9a-f-]{36}\.webp$/,
      );
    });
  });
});
