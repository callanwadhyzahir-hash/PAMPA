import 'reflect-metadata';

import type { SecurityContext } from '../../../auth/types/security-context';
import { REQUIRED_PERMISSIONS_KEY } from '../../../auth/decorators/require-permissions.decorator';
import { PRODUCT_PERMISSIONS } from '../product.permissions';
import { ProductImagesController } from './product-images.controller';
import type { ProductImagesService } from './product-images.service';

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

function requiredPermissions(method: 'upload' | 'remove') {
  const handler = Object.getOwnPropertyDescriptor(
    ProductImagesController.prototype,
    method,
  )?.value as object;
  return Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler) as string[];
}

describe('ProductImagesController', () => {
  it('requires products.update to upload/replace an image', () => {
    expect(requiredPermissions('upload')).toEqual([PRODUCT_PERMISSIONS.update]);
  });

  it('requires products.update to remove an image', () => {
    expect(requiredPermissions('remove')).toEqual([PRODUCT_PERMISSIONS.update]);
  });

  it('delegates upload to the service with the caller company context and file', async () => {
    const file = {
      mimetype: 'image/png',
      buffer: Buffer.from('x'),
    } as Express.Multer.File;
    const service = {
      upload: jest.fn().mockResolvedValue({
        id: 'product-a',
        imageUrl: 'https://blob.example/x.webp',
      }),
    };
    const controller = new ProductImagesController(
      service as unknown as ProductImagesService,
    );

    const result = await controller.upload(context, 'product-a', file);

    expect(service.upload).toHaveBeenCalledWith(context, 'product-a', file);
    expect(result).toEqual({
      id: 'product-a',
      imageUrl: 'https://blob.example/x.webp',
    });
  });

  it('delegates remove to the service with the caller company context', async () => {
    const service = {
      remove: jest.fn().mockResolvedValue({ id: 'product-a', imageUrl: null }),
    };
    const controller = new ProductImagesController(
      service as unknown as ProductImagesService,
    );

    const result = await controller.remove(context, 'product-a');

    expect(service.remove).toHaveBeenCalledWith(context, 'product-a');
    expect(result).toEqual({ id: 'product-a', imageUrl: null });
  });
});
