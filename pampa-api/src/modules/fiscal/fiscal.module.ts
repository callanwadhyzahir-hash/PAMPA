import { DynamicModule, Module } from '@nestjs/common';

import { SalesModule } from '../commercial/sales/sales.module';
import { ArcaModule } from './arca/arca.module';
import { ArcaConfigService } from './arca/arca.config';
import { ArcaConfigurationError } from './arca/arca.errors';
import { ArcaWsfeService } from './arca/arca-wsfe.service';
import { ArcaInvoiceFiscalizationService } from './arca-invoice-fiscalization.service';
import { FiscalController } from './fiscal.controller';
import {
  FISCAL_POINT_OF_SALE,
  FiscalPointOfSaleConfig,
} from './fiscal-point-of-sale.token';
import { FISCAL_PROVIDER } from './fiscal-provider.token';
import { MockFiscalProviderService } from './mock/mock-fiscal-provider.service';

const FACTURA_C_CBTE_TIPO = '11';
const MOCK_POINT_OF_SALE = '0000';

/**
 * FISCAL_PROVIDER selects the FiscalProvider implementation at boot time.
 * Deliberately fail-closed: an unset or misspelled value crashes startup
 * instead of silently defaulting to either provider (see plan wild-kindling-adleman.md).
 */
@Module({})
export class FiscalModule {
  static forRoot(): DynamicModule {
    const rawProvider = process.env.FISCAL_PROVIDER;

    if (rawProvider === 'arca') {
      return {
        module: FiscalModule,
        imports: [ArcaModule, SalesModule],
        controllers: [FiscalController],
        providers: [
          ArcaInvoiceFiscalizationService,
          { provide: FISCAL_PROVIDER, useExisting: ArcaWsfeService },
          {
            provide: FISCAL_POINT_OF_SALE,
            useFactory: (arcaConfig: ArcaConfigService): FiscalPointOfSaleConfig => {
              const puntoVenta = arcaConfig.config.wsfePuntoVenta;
              if (puntoVenta === undefined) {
                throw new ArcaConfigurationError(
                  'ARCA_WSFE_PUNTO_VENTA no está configurado.',
                );
              }
              return {
                pointOfSale: String(puntoVenta).padStart(4, '0'),
                voucherTypeCode: FACTURA_C_CBTE_TIPO,
              };
            },
            inject: [ArcaConfigService],
          },
        ],
        exports: [ArcaInvoiceFiscalizationService],
      };
    }

    if (rawProvider === 'mock') {
      return {
        module: FiscalModule,
        imports: [SalesModule],
        controllers: [FiscalController],
        providers: [
          ArcaInvoiceFiscalizationService,
          MockFiscalProviderService,
          {
            provide: FISCAL_PROVIDER,
            useExisting: MockFiscalProviderService,
          },
          {
            provide: FISCAL_POINT_OF_SALE,
            useValue: {
              pointOfSale: MOCK_POINT_OF_SALE,
              voucherTypeCode: FACTURA_C_CBTE_TIPO,
            } satisfies FiscalPointOfSaleConfig,
          },
        ],
        exports: [ArcaInvoiceFiscalizationService],
      };
    }

    throw new Error(
      `FISCAL_PROVIDER debe ser 'mock' o 'arca' (valor actual: ${
        rawProvider ?? '(sin definir)'
      }).`,
    );
  }
}
