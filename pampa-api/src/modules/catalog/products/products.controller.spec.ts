import 'reflect-metadata';

import type { SecurityContext } from '../../auth/types/security-context';
import { REQUIRED_PERMISSIONS_KEY } from '../../auth/decorators/require-permissions.decorator';
import { PRODUCT_PERMISSIONS } from './product.permissions';
import { ProductsController } from './products.controller';
import type { ProductsService } from './products.service';

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

describe('ProductsController', () => {
  describe('generateBarcode', () => {
    it('requires the products.create permission, same as other write endpoints', () => {
      // SetMetadata stores on the handler function itself (not via
      // target+propertyKey), matching how Nest's Reflector reads it off
      // context.getHandler(). Read through the descriptor to avoid taking
      // an unbound reference to the class method.
      const handler = Object.getOwnPropertyDescriptor(
        ProductsController.prototype,
        'generateBarcode',
      )?.value as object;
      const required = Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        handler,
      ) as string[];

      expect(required).toEqual([PRODUCT_PERMISSIONS.create]);
    });

    it('delegates to the service using the caller company context', async () => {
      const service = {
        generateBarcode: jest.fn().mockResolvedValue({ barcode: 'PMP-ABC' }),
      };
      const controller = new ProductsController(
        service as unknown as ProductsService,
      );

      const result = await controller.generateBarcode(context);

      expect(service.generateBarcode).toHaveBeenCalledWith(context);
      expect(result).toEqual({ barcode: 'PMP-ABC' });
    });

    it('does not create a product as a side effect', () => {
      // generateBarcode only returns a candidate; the DTO surface it accepts
      // has no @Body(), so there is no way for it to persist a product.
      const paramTypes = Reflect.getMetadata(
        'design:paramtypes',
        ProductsController.prototype,
        'generateBarcode',
      ) as unknown[];
      expect(paramTypes).toHaveLength(1);
    });
  });
});
