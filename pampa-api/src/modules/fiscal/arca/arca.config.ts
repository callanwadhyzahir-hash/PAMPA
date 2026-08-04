import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FiscalEnvironment } from '../arca-fiscal.contracts';
import { ArcaConfigurationError } from './arca.errors';
import { normalizePem } from './arca-pem.util';

const WSAA_LOGIN_CMS_URL: Record<FiscalEnvironment, string> = {
  HOMOLOGACION: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
  PRODUCCION: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
};

const WSFE_URL: Record<FiscalEnvironment, string> = {
  HOMOLOGACION: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
  PRODUCCION: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
};

export interface ArcaConfig {
  environment: FiscalEnvironment;
  cuit: string;
  certificatePem: string;
  privateKeyPem: string;
  privateKeyPassphrase?: string;
  wsaaLoginCmsUrl: string;
  wsfeUrl: string;
  /** Undefined when ARCA_WSFE_PUNTO_VENTA isn't set — only WSAA callers can
   *  omit it; WSFE callers must validate it's present before use. */
  wsfePuntoVenta: number | undefined;
}

@Injectable()
export class ArcaConfigService {
  readonly config: ArcaConfig;

  constructor(configService: ConfigService) {
    const rawEnvironment = configService.get<string>('ARCA_ENVIRONMENT');
    if (rawEnvironment !== 'homologation' && rawEnvironment !== 'production') {
      throw new ArcaConfigurationError(
        "ARCA_ENVIRONMENT debe ser 'homologation' o 'production'.",
      );
    }
    const environment: FiscalEnvironment =
      rawEnvironment === 'production' ? 'PRODUCCION' : 'HOMOLOGACION';

    const rawCuit = configService.get<string>('ARCA_CUIT');
    const cuit = rawCuit?.replace(/\D/g, '') ?? '';
    if (cuit.length !== 11) {
      throw new ArcaConfigurationError('ARCA_CUIT debe tener 11 dígitos.');
    }

    const certificatePem = normalizePem(
      configService.get<string>('ARCA_CERTIFICATE'),
      'ARCA_CERTIFICATE',
    );
    const privateKeyPem = normalizePem(
      configService.get<string>('ARCA_PRIVATE_KEY'),
      'ARCA_PRIVATE_KEY',
    );
    const privateKeyPassphrase = configService.get<string>(
      'ARCA_PRIVATE_KEY_PASSPHRASE',
    );

    const rawPuntoVenta = configService.get<string>('ARCA_WSFE_PUNTO_VENTA');
    const parsedPuntoVenta = Number(rawPuntoVenta);
    const wsfePuntoVenta =
      rawPuntoVenta &&
      Number.isInteger(parsedPuntoVenta) &&
      parsedPuntoVenta >= 1 &&
      parsedPuntoVenta <= 99998
        ? parsedPuntoVenta
        : undefined;

    this.config = {
      environment,
      cuit,
      certificatePem,
      privateKeyPem,
      privateKeyPassphrase: privateKeyPassphrase || undefined,
      wsaaLoginCmsUrl: WSAA_LOGIN_CMS_URL[environment],
      wsfeUrl: WSFE_URL[environment],
      wsfePuntoVenta,
    };
  }
}
