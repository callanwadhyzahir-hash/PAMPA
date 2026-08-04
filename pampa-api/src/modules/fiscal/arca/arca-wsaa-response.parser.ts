import { ArcaAuthenticationError, ArcaTransportError } from './arca.errors';

export interface ParsedAccessTicket {
  token: string;
  sign: string;
  generationTime: Date;
  expirationTime: Date;
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(
    new RegExp(`<(?:\\w+:)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, 'i'),
  );
  return match ? match[1].trim() : null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Narrow, regex-based extraction rather than a general XML parser: the WSAA
 * response is a small, fixed shape (a LoginTicketResponse XML string,
 * html-escaped, wrapped in a SOAP loginCmsReturn element), so a full parser
 * dependency isn't warranted for this sprint.
 */
export function parseLoginCmsResponse(soapBody: string): ParsedAccessTicket {
  const faultString = extractTag(soapBody, 'faultstring');
  if (faultString) {
    throw new ArcaAuthenticationError(
      `WSAA rechazó la solicitud: ${faultString}`,
    );
  }

  const wrapped = extractTag(soapBody, 'loginCmsReturn');
  const innerXml = wrapped ? decodeXmlEntities(wrapped) : soapBody;

  const token = extractTag(innerXml, 'token');
  const sign = extractTag(innerXml, 'sign');
  const generationTimeRaw = extractTag(innerXml, 'generationTime');
  const expirationTimeRaw = extractTag(innerXml, 'expirationTime');

  if (!token || !sign || !expirationTimeRaw) {
    throw new ArcaTransportError(
      'La respuesta de WSAA no tiene el formato esperado (faltan token/sign/expirationTime).',
    );
  }

  const expirationTime = new Date(expirationTimeRaw);
  if (Number.isNaN(expirationTime.getTime())) {
    throw new ArcaTransportError(
      'WSAA devolvió un expirationTime no parseable.',
    );
  }

  const generationTime = generationTimeRaw
    ? new Date(generationTimeRaw)
    : new Date();

  return { token, sign, generationTime, expirationTime };
}
