import { Inject, Injectable, Optional } from '@nestjs/common';

import {
  ExistingVoucherQuery,
  FiscalizationResult,
  FiscalProvider,
  FiscalStatus,
  LastAuthorizedVoucherQuery,
  RequestCaeQuery,
} from '../arca-fiscal.contracts';
import { ArcaConfigService } from './arca.config';
import { ArcaWsaaService } from './arca-wsaa.service';
import { ArcaTransportError } from './arca.errors';
import {
  buildFECAESolicitarXml,
  buildFECompConsultarXml,
  buildFECompUltimoAutorizadoXml,
} from './arca-wsfe-request.builder';
import {
  parseFECAESolicitarResponse,
  parseFECompConsultarResponse,
  parseFECompUltimoAutorizadoResponse,
} from './arca-wsfe-response.parser';

export type WsfeFetchLike = typeof fetch;

export const ARCA_WSFE_FETCH = Symbol('ARCA_WSFE_FETCH');

/**
 * Factura C constraints per WSFEv1 Manual del Desarrollador v4.6: no IVA
 * discrimination, so ImpIVA/ImpOpEx/ImpTotConc/ImpTrib are always 0 and
 * ImpNeto carries the full subtotal.
 */
const FACTURA_C_CBTE_TIPO = 11;
const CONCEPTO_PRODUCTOS = 1;
const DOC_TIPO_CONSUMIDOR_FINAL = 99;
const DOC_TIPO_CUIT = 80;
const CONDICION_IVA_CONSUMIDOR_FINAL = 5;
const CONDICION_IVA_RESPONSABLE_INSCRIPTO = 1;

interface ClientSnapshotShape {
  tax_id?: string | null;
  is_company?: boolean;
}

interface TotalsSnapshotShape {
  total?: string;
  subtotal?: string;
}

function deriveBuyer(clientSnapshot: unknown): {
  docTipo: number;
  docNro: number;
  condicionIVAReceptorId: number;
} {
  const client = (clientSnapshot ?? null) as ClientSnapshotShape | null;
  if (!client?.tax_id) {
    return {
      docTipo: DOC_TIPO_CONSUMIDOR_FINAL,
      docNro: 0,
      condicionIVAReceptorId: CONDICION_IVA_CONSUMIDOR_FINAL,
    };
  }

  return {
    docTipo: DOC_TIPO_CUIT,
    docNro: Number(client.tax_id.replace(/\D/g, '')),
    condicionIVAReceptorId: client.is_company
      ? CONDICION_IVA_RESPONSABLE_INSCRIPTO
      : CONDICION_IVA_CONSUMIDOR_FINAL,
  };
}

@Injectable()
export class ArcaWsfeService implements FiscalProvider {
  private readonly fetchImpl: WsfeFetchLike;

  constructor(
    private readonly arcaConfig: ArcaConfigService,
    private readonly wsaaService: ArcaWsaaService,
    @Optional() @Inject(ARCA_WSFE_FETCH) fetchImpl?: WsfeFetchLike,
  ) {
    this.fetchImpl = fetchImpl ?? fetch;
  }

  private async post(bodyXml: string): Promise<string> {
    let response: Response;
    try {
      response = await this.fetchImpl(this.arcaConfig.config.wsfeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: '' },
        body: bodyXml,
      });
    } catch (error) {
      throw new ArcaTransportError('No se pudo contactar a WSFE.', error);
    }

    const responseText = await response.text();
    if (!response.ok) {
      throw new ArcaTransportError(
        `WSFE respondió HTTP ${response.status}: ${responseText}`,
      );
    }
    return responseText;
  }

  async getLastAuthorizedVoucherNumber(
    query: LastAuthorizedVoucherQuery,
  ): Promise<number> {
    const auth = await this.getAuth();
    const xml = buildFECompUltimoAutorizadoXml({
      auth,
      ptoVta: Number(query.pointOfSale),
      cbteTipo: Number(query.voucherTypeCode),
    });
    const responseText = await this.post(xml);
    return parseFECompUltimoAutorizadoResponse(responseText).cbteNro;
  }

  async requestCae(query: RequestCaeQuery): Promise<FiscalizationResult> {
    const auth = await this.getAuth();
    const totals = (query.totalsSnapshot ?? {}) as TotalsSnapshotShape;
    const impTotal = Number(totals.total ?? '0');
    const impNeto = Number(totals.subtotal ?? totals.total ?? '0');
    const buyer = deriveBuyer(query.clientSnapshot);

    const xml = buildFECAESolicitarXml({
      auth,
      ptoVta: Number(query.pointOfSale),
      cbteTipo: Number(query.voucherTypeCode),
      cbteNro: query.voucherNumber,
      concepto: CONCEPTO_PRODUCTOS,
      docTipo: buyer.docTipo,
      docNro: buyer.docNro,
      cbteFch: new Date(),
      impTotal,
      impNeto,
      impIva: 0,
      impOpEx: 0,
      impTotConc: 0,
      impTrib: 0,
      condicionIVAReceptorId: buyer.condicionIVAReceptorId,
    });

    const responseText = await this.post(xml);
    const parsed = parseFECAESolicitarResponse(responseText);
    const status: FiscalStatus = parsed.resultado === 'A' ? 'APPROVED' : 'REJECTED';
    const firstError = parsed.errores[0] ?? parsed.observaciones[0];

    return {
      status,
      // The orchestrator persists the real attempt number from
      // invoice_fiscal_attempt; this value is a placeholder it overwrites.
      attemptNumber: 0,
      pointOfSale: query.pointOfSale,
      voucherTypeCode: query.voucherTypeCode,
      invoiceNumber: String(query.voucherNumber),
      cae: parsed.cae ?? undefined,
      caeExpiration: parsed.caeFchVto ?? undefined,
      errorCode: firstError?.code,
      errorMessage: firstError?.msg,
    };
  }

  async getExistingVoucher(
    query: ExistingVoucherQuery,
  ): Promise<FiscalizationResult | null> {
    const auth = await this.getAuth();
    const xml = buildFECompConsultarXml({
      auth,
      ptoVta: Number(query.pointOfSale),
      cbteTipo: Number(query.voucherTypeCode),
      cbteNro: query.voucherNumber,
    });

    const responseText = await this.post(xml);
    const parsed = parseFECompConsultarResponse(responseText);
    if (!parsed || !parsed.cae) return null;

    return {
      status: 'APPROVED',
      attemptNumber: 0,
      pointOfSale: query.pointOfSale,
      voucherTypeCode: query.voucherTypeCode,
      invoiceNumber: String(query.voucherNumber),
      cae: parsed.cae,
      caeExpiration: parsed.caeFchVto ?? undefined,
    };
  }

  private async getAuth() {
    const ticket = await this.wsaaService.getAccessTicket();
    return {
      cuit: this.arcaConfig.config.cuit,
      token: ticket.token,
      sign: ticket.sign,
    };
  }
}

export { FACTURA_C_CBTE_TIPO };
