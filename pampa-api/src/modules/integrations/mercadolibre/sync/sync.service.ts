import { Inject, Injectable } from '@nestjs/common';

import { MERCADOLIBRE_CLIENT } from '../client/mercadolibre-client.token';
import type { MercadoLibreClient } from '../client/mercadolibre-client.interface';
import { MercadoLibreConnectionRepository } from '../connection/connection.repository';
import { MercadoLibreConnectionService } from '../connection/connection.service';
import { MercadoLibreListingRepository } from '../listings/listings.repository';
import {
  MercadoLibreApiError,
  MercadoLibreDomainError,
  MercadoLibreNotConnectedError,
} from '../mercadolibre.errors';
import { MercadoLibreOrderRepository } from '../orders/orders.repository';

@Injectable()
export class MercadoLibreSyncService {
  constructor(
    @Inject(MERCADOLIBRE_CLIENT) private readonly client: MercadoLibreClient,
    private readonly connectionRepository: MercadoLibreConnectionRepository,
    private readonly connectionService: MercadoLibreConnectionService,
    private readonly listingsRepository: MercadoLibreListingRepository,
    private readonly ordersRepository: MercadoLibreOrderRepository,
  ) {}

  /** Manual, explicit, idempotent: re-running upserts the same rows by (connection_id, ml_item_id / ml_order_id) instead of duplicating. No cron, no background worker. */
  async sync(companyId: string) {
    const connection = await this.connectionRepository.findByCompany(companyId);
    if (!connection || connection.status !== 'CONNECTED') {
      throw new MercadoLibreNotConnectedError();
    }

    try {
      const { accessToken, mlUserId } = await this.connectionService.getValidAccessToken(
        companyId,
        this.client,
      );

      const [listings, orders] = await Promise.all([
        this.client.listUserItems({ accessToken, sellerId: mlUserId }),
        this.client.listOrders({ accessToken, sellerId: mlUserId }),
      ]);

      await this.listingsRepository.upsertMany(companyId, connection.id, listings);
      await this.ordersRepository.upsertMany(companyId, connection.id, orders);
      await this.connectionRepository.markSynced(companyId);

      return {
        syncedAt: new Date(),
        listingsSynced: listings.length,
        ordersSynced: orders.length,
      };
    } catch (error) {
      if (error instanceof MercadoLibreDomainError) {
        const body = error.getResponse();
        const code =
          typeof body === 'object' && body && 'code' in body
            ? String((body as { code: unknown }).code)
            : 'MERCADOLIBRE_API_ERROR';
        await this.connectionRepository.markSyncError(companyId, code);
        throw error;
      }
      await this.connectionRepository.markSyncError(companyId, 'MERCADOLIBRE_API_ERROR');
      throw new MercadoLibreApiError();
    }
  }
}
