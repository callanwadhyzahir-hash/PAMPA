import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { ArcaConfigService } from './arca.config';
import { buildLoginTicketRequestXml } from './arca-tra.builder';
import { signLoginTicketRequest } from './arca-cms-signer';
import {
  parseLoginCmsResponse,
  ParsedAccessTicket,
} from './arca-wsaa-response.parser';
import { ArcaTransportError } from './arca.errors';

const WSFE_SERVICE = 'wsfe';
const MINIMUM_VALIDITY_MS = 5 * 60 * 1000;

export interface AccessTicket {
  token: string;
  sign: string;
  expirationTime: Date;
}

export type FetchLike = typeof fetch;

export const ARCA_FETCH = Symbol('ARCA_FETCH');

function buildSoapEnvelope(cmsBase64: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desarrollo.afip.gov">',
    '  <soapenv:Header/>',
    '  <soapenv:Body>',
    '    <wsaa:loginCms>',
    `      <wsaa:in0>${cmsBase64}</wsaa:in0>`,
    '    </wsaa:loginCms>',
    '  </soapenv:Body>',
    '</soapenv:Envelope>',
  ].join('\n');
}

@Injectable()
export class ArcaWsaaService {
  private readonly logger = new Logger(ArcaWsaaService.name);
  private readonly ticketCache = new Map<string, ParsedAccessTicket>();
  private readonly inFlight = new Map<string, Promise<AccessTicket>>();
  private readonly fetchImpl: FetchLike;

  constructor(
    private readonly arcaConfig: ArcaConfigService,
    @Optional() @Inject(ARCA_FETCH) fetchImpl?: FetchLike,
  ) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  private cacheKey(): string {
    const { environment, cuit } = this.arcaConfig.config;
    return `${environment}:${cuit}:${WSFE_SERVICE}`;
  }

  private hasMinimumValidity(expirationTime: Date): boolean {
    return expirationTime.getTime() - Date.now() >= MINIMUM_VALIDITY_MS;
  }

  /**
   * Reuses the cached access ticket while it keeps at least 5 minutes of
   * validity; otherwise requests a new one. Concurrent callers that land on
   * a stale/missing ticket share the same in-flight WSAA request instead of
   * each triggering their own LoginCms call.
   */
  async getAccessTicket(): Promise<AccessTicket> {
    const key = this.cacheKey();
    const cached = this.ticketCache.get(key);
    if (cached && this.hasMinimumValidity(cached.expirationTime)) {
      return cached;
    }

    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }

    const request = this.requestNewTicket(key);
    this.inFlight.set(key, request);
    try {
      return await request;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async requestNewTicket(key: string): Promise<AccessTicket> {
    const {
      certificatePem,
      privateKeyPem,
      privateKeyPassphrase,
      wsaaLoginCmsUrl,
    } = this.arcaConfig.config;

    const traXml = buildLoginTicketRequestXml({ service: WSFE_SERVICE });
    const cms = signLoginTicketRequest(
      traXml,
      certificatePem,
      privateKeyPem,
      privateKeyPassphrase,
    );
    const envelope = buildSoapEnvelope(cms);

    let responseText: string;
    try {
      const response = await this.fetchImpl(wsaaLoginCmsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
        body: envelope,
      });
      responseText = await response.text();
      if (!response.ok) {
        throw new ArcaTransportError(`WSAA respondió HTTP ${response.status}.`);
      }
    } catch (error) {
      if (error instanceof ArcaTransportError) throw error;
      throw new ArcaTransportError('No se pudo contactar a WSAA.', error);
    }

    const ticket = parseLoginCmsResponse(responseText);
    this.ticketCache.set(key, ticket);
    this.logger.log(
      `Ticket de acceso WSAA renovado para ${WSFE_SERVICE} (vence ${ticket.expirationTime.toISOString()}).`,
    );
    return ticket;
  }
}
