import { normalizePem } from './arca-pem.util';
import { ArcaConfigurationError } from './arca.errors';

const SAMPLE_PEM = [
  '-----BEGIN CERTIFICATE-----',
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA',
  '-----END CERTIFICATE-----',
].join('\n');

describe('normalizePem', () => {
  it('passes through a real multi-line PEM unchanged', () => {
    expect(normalizePem(SAMPLE_PEM, 'ARCA_CERTIFICATE')).toBe(SAMPLE_PEM);
  });

  it('normalizes a PEM whose newlines were escaped as literal \\n', () => {
    const escaped = SAMPLE_PEM.replace(/\n/g, '\\n');
    expect(normalizePem(escaped, 'ARCA_CERTIFICATE')).toBe(SAMPLE_PEM);
  });

  it('decodes a base64-encoded PEM', () => {
    const encoded = Buffer.from(SAMPLE_PEM, 'utf8').toString('base64');
    expect(normalizePem(encoded, 'ARCA_CERTIFICATE')).toBe(SAMPLE_PEM);
  });

  it('throws ArcaConfigurationError when the value is missing', () => {
    expect(() => normalizePem(undefined, 'ARCA_CERTIFICATE')).toThrow(
      ArcaConfigurationError,
    );
    expect(() => normalizePem('   ', 'ARCA_CERTIFICATE')).toThrow(
      ArcaConfigurationError,
    );
  });

  it('throws ArcaConfigurationError when the value is neither PEM nor base64-PEM', () => {
    expect(() =>
      normalizePem('not-a-pem-or-base64!!', 'ARCA_CERTIFICATE'),
    ).toThrow(ArcaConfigurationError);
  });
});
