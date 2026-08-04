import { ArcaTransportError } from './arca.errors';
import { ArcaWsfeError } from './arca-wsfe.errors';

export interface ParsedUltimoAutorizado {
  cbteNro: number;
}

export interface WsfeErrorEntry {
  code: string;
  msg: string;
}

export interface ParsedCaeResult {
  resultado: 'A' | 'R';
  cae: string | null;
  caeFchVto: Date | null;
  observaciones: WsfeErrorEntry[];
  errores: WsfeErrorEntry[];
}

export interface ParsedExistingVoucher {
  resultado: string | null;
  cae: string | null;
  caeFchVto: Date | null;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(
    new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, 'i'),
  );
  return match ? match[1].trim() : null;
}

function extractBlocks(xml: string, tag: string): string[] {
  const regex = new RegExp(
    `<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`,
    'gi',
  );
  return Array.from(xml.matchAll(regex), (match) => match[1]);
}

function extractEntries(xml: string, containerTag: string, itemTag: string): WsfeErrorEntry[] {
  const container = extractTag(xml, containerTag);
  if (!container) return [];
  return extractBlocks(container, itemTag).map((block) => ({
    code: extractTag(block, 'Code') ?? '',
    msg: extractTag(block, 'Msg') ?? '',
  }));
}

function parseAfipDate(raw: string | null): Date | null {
  if (!raw || raw.length !== 8) return null;
  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function assertNoSoapFault(soapBody: string): void {
  const faultString = extractTag(soapBody, 'faultstring');
  if (faultString) {
    throw new ArcaTransportError(`WSFE rechazó la solicitud: ${faultString}`);
  }
}

export function parseFECompUltimoAutorizadoResponse(
  soapBody: string,
): ParsedUltimoAutorizado {
  assertNoSoapFault(soapBody);

  const result = extractTag(soapBody, 'FECompUltimoAutorizadoResult') ?? soapBody;
  const errores = extractEntries(result, 'Errors', 'Err');
  if (errores.length > 0) {
    throw new ArcaWsfeError(
      `WSFE rechazó FECompUltimoAutorizado: ${errores.map((e) => `${e.code} ${e.msg}`).join('; ')}`,
      errores,
    );
  }

  const cbteNroRaw = extractTag(result, 'CbteNro');
  if (!cbteNroRaw) {
    throw new ArcaTransportError(
      'La respuesta de WSFE (FECompUltimoAutorizado) no tiene el formato esperado (falta CbteNro).',
    );
  }

  return { cbteNro: Number(cbteNroRaw) };
}

export function parseFECAESolicitarResponse(soapBody: string): ParsedCaeResult {
  assertNoSoapFault(soapBody);

  const result = extractTag(soapBody, 'FECAESolicitarResult') ?? soapBody;
  const errores = extractEntries(result, 'Errors', 'Err');

  const detResp = extractTag(result, 'FEDetResponse') ?? result;
  const resultadoRaw = extractTag(detResp, 'Resultado');
  if (resultadoRaw !== 'A' && resultadoRaw !== 'R') {
    throw new ArcaTransportError(
      'La respuesta de WSFE (FECAESolicitar) no tiene el formato esperado (falta Resultado).',
    );
  }

  const observaciones = extractEntries(detResp, 'Obs', 'Observaciones');

  return {
    resultado: resultadoRaw,
    cae: extractTag(detResp, 'CAE'),
    caeFchVto: parseAfipDate(extractTag(detResp, 'CAEFchVto')),
    observaciones,
    errores,
  };
}

export function parseFECompConsultarResponse(
  soapBody: string,
): ParsedExistingVoucher | null {
  assertNoSoapFault(soapBody);

  const result = extractTag(soapBody, 'FECompConsultarResult') ?? soapBody;
  const resultGet = extractTag(result, 'ResultGet');
  if (!resultGet) {
    // ARCA responds with only <Errors> (no <ResultGet>) when the voucher
    // doesn't exist yet — that's the expected "not found" case, not a fault.
    return null;
  }

  return {
    resultado: extractTag(resultGet, 'Resultado'),
    cae: extractTag(resultGet, 'CodAutorizacion'),
    caeFchVto: parseAfipDate(extractTag(resultGet, 'FchVto')),
  };
}
