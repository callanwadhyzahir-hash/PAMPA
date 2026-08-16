import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { SecurityAuditModule } from '../../auth/audit/security-audit.module';
import { MockMercadoLibreClient } from './client/mock-mercadolibre-client.service';
import { RealMercadoLibreClient } from './client/real-mercadolibre-client.service';
import { MERCADOLIBRE_CLIENT } from './client/mercadolibre-client.token';
import { MercadoLibreConnectionRepository } from './connection/connection.repository';
import { MercadoLibreConnectionService } from './connection/connection.service';
import { MercadoLibreTokenCipher } from './crypto/mercadolibre-token-cipher';
import { MercadoLibreListingRepository } from './listings/listings.repository';
import { MercadoLibreListingsService } from './listings/listings.service';
import { MercadoLibreConfigService } from './mercadolibre.config';
import { MercadoLibreController } from './mercadolibre.controller';
import { MercadoLibreOAuthStateService } from './oauth/oauth-state.service';
import { MercadoLibreOAuthService } from './oauth/oauth.service';
import { MercadoLibreOrderRepository } from './orders/orders.repository';
import { MercadoLibreOrdersService } from './orders/orders.service';
import { MercadoLibreSyncService } from './sync/sync.service';

@Module({
  imports: [
    ConfigModule,
    SecurityAuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET must contain at least 32 characters.');
        }
        return { secret };
      },
    }),
  ],
  controllers: [MercadoLibreController],
  providers: [
    MercadoLibreConfigService,
    MercadoLibreTokenCipher,
    RealMercadoLibreClient,
    MockMercadoLibreClient,
    {
      provide: MERCADOLIBRE_CLIENT,
      useFactory: (
        config: MercadoLibreConfigService,
        realClient: RealMercadoLibreClient,
        mockClient: MockMercadoLibreClient,
      ) => (config.mockMode ? mockClient : realClient),
      inject: [MercadoLibreConfigService, RealMercadoLibreClient, MockMercadoLibreClient],
    },
    MercadoLibreConnectionRepository,
    MercadoLibreConnectionService,
    MercadoLibreOAuthStateService,
    MercadoLibreOAuthService,
    MercadoLibreListingRepository,
    MercadoLibreListingsService,
    MercadoLibreOrderRepository,
    MercadoLibreOrdersService,
    MercadoLibreSyncService,
  ],
})
export class MercadoLibreModule {}
