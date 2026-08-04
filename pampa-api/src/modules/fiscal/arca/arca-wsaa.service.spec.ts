import * as forge from 'node-forge';
import { ConfigService } from '@nestjs/config';

import { ArcaConfigService } from './arca.config';
import { ArcaWsaaService, FetchLike } from './arca-wsaa.service';

function createSelfSignedTestCertificate(): {
  certificatePem: string;
  privateKeyPem: string;
} {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const attrs = [{ name: 'commonName', value: 'pampa-test' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    certificatePem: forge.pki.certificateToPem(cert),
    privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

function fakeConfigService(
  certificatePem: string,
  privateKeyPem: string,
): ConfigService {
  const values: Record<string, string> = {
    ARCA_ENVIRONMENT: 'homologation',
    ARCA_CUIT: '20304050607',
    ARCA_CERTIFICATE: certificatePem,
    ARCA_PRIVATE_KEY: privateKeyPem,
  };
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildSoapSuccessResponse(
  expirationTime: Date,
  generationTime = new Date(),
): string {
  const innerXml = [
    '<loginTicketResponse version="1.0">',
    '  <header>',
    `    <generationTime>${generationTime.toISOString()}</generationTime>`,
    `    <expirationTime>${expirationTime.toISOString()}</expirationTime>`,
    '  </header>',
    '  <credentials>',
    '    <token>TOKEN</token>',
    '    <sign>SIGN</sign>',
    '  </credentials>',
    '</loginTicketResponse>',
  ].join('');

  return (
    '<soapenv:Envelope><soapenv:Body>' +
    `<loginCmsReturn>${escapeXml(innerXml)}</loginCmsReturn>` +
    '</soapenv:Body></soapenv:Envelope>'
  );
}

function fakeFetchReturning(body: string): jest.Mock {
  return jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve(body),
    }),
  );
}

describe('ArcaWsaaService', () => {
  let certificatePem: string;
  let privateKeyPem: string;

  beforeAll(() => {
    ({ certificatePem, privateKeyPem } = createSelfSignedTestCertificate());
  });

  function buildService(fetchImpl: FetchLike) {
    const config = new ArcaConfigService(
      fakeConfigService(certificatePem, privateKeyPem),
    );
    return new ArcaWsaaService(config, fetchImpl);
  }

  it('reuses the cached ticket while it has plenty of validity', async () => {
    const farExpiration = new Date(Date.now() + 60 * 60 * 1000);
    const fetchMock = fakeFetchReturning(
      buildSoapSuccessResponse(farExpiration),
    );
    const service = buildService(fetchMock);

    const first = await service.getAccessTicket();
    const second = await service.getAccessTicket();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('renews the ticket once less than 5 minutes of validity remain', async () => {
    const almostExpired = new Date(Date.now() + 2 * 60 * 1000);
    const farExpiration = new Date(Date.now() + 60 * 60 * 1000);
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(buildSoapSuccessResponse(almostExpired)),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(buildSoapSuccessResponse(farExpiration)),
      });
    const service = buildService(fetchMock);

    await service.getAccessTicket();
    await service.getAccessTicket();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('deduplicates concurrent requests into a single WSAA call', async () => {
    const farExpiration = new Date(Date.now() + 60 * 60 * 1000);
    let resolveFetch!: (value: unknown) => void;
    const fetchMock = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const service = buildService(fetchMock as unknown as FetchLike);

    const calls = Array.from({ length: 10 }, () => service.getAccessTicket());
    resolveFetch({
      ok: true,
      status: 200,
      text: () => Promise.resolve(buildSoapSuccessResponse(farExpiration)),
    });
    const results = await Promise.all(calls);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new Set(results.map((r) => r.token)).size).toBe(1);
  });
});
