import { parseLoginCmsResponse } from './arca-wsaa-response.parser';
import { ArcaAuthenticationError, ArcaTransportError } from './arca.errors';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSoapSuccessResponse(): string {
  const innerXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<loginTicketResponse version="1.0">',
    '  <header>',
    '    <uniqueId>1234567890</uniqueId>',
    '    <generationTime>2026-08-03T13:00:00Z</generationTime>',
    '    <expirationTime>2026-08-04T01:00:00Z</expirationTime>',
    '  </header>',
    '  <credentials>',
    '    <token>FAKE_TOKEN_VALUE</token>',
    '    <sign>FAKE_SIGN_VALUE</sign>',
    '  </credentials>',
    '</loginTicketResponse>',
  ].join('');

  return (
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' +
    '<soapenv:Body>' +
    '<loginCmsResponse xmlns="http://wsaa.view.sua.dvadac.desarrollo.afip.gov">' +
    `<loginCmsReturn>${escapeXml(innerXml)}</loginCmsReturn>` +
    '</loginCmsResponse>' +
    '</soapenv:Body>' +
    '</soapenv:Envelope>'
  );
}

function buildSoapFaultResponse(): string {
  return (
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' +
    '<soapenv:Body>' +
    '<soapenv:Fault>' +
    '<faultcode>soapenv:Server</faultcode>' +
    '<faultstring>El CMS no pudo ser verificado</faultstring>' +
    '</soapenv:Fault>' +
    '</soapenv:Body>' +
    '</soapenv:Envelope>'
  );
}

describe('parseLoginCmsResponse', () => {
  it('parses a valid WSAA success response', () => {
    const result = parseLoginCmsResponse(buildSoapSuccessResponse());

    expect(result.token).toBe('FAKE_TOKEN_VALUE');
    expect(result.sign).toBe('FAKE_SIGN_VALUE');
    expect(result.generationTime).toEqual(new Date('2026-08-03T13:00:00Z'));
    expect(result.expirationTime).toEqual(new Date('2026-08-04T01:00:00Z'));
  });

  it('raises a sanitized ArcaAuthenticationError on a SOAP fault', () => {
    let caught: unknown;
    try {
      parseLoginCmsResponse(buildSoapFaultResponse());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ArcaAuthenticationError);
    const message = (caught as Error).message;
    expect(message).toContain('El CMS no pudo ser verificado');
    // The error surfaces AFIP's own fault text, never raw certificate/CMS bytes.
    expect(message).not.toContain('-----BEGIN');
    expect(message.length).toBeLessThan(500);
  });

  it('raises ArcaTransportError when the response is missing expected fields', () => {
    const malformed =
      '<soapenv:Envelope><soapenv:Body><somethingElse/></soapenv:Body></soapenv:Envelope>';
    expect(() => parseLoginCmsResponse(malformed)).toThrow(ArcaTransportError);
  });
});
