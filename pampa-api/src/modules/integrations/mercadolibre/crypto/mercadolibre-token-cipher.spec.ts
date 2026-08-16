import { ConfigService } from '@nestjs/config';

import { MercadoLibreConfigurationError } from '../mercadolibre.errors';
import { MercadoLibreTokenCipher } from './mercadolibre-token-cipher';

function buildCipher(key: string | undefined) {
  const config = { get: () => key } as unknown as ConfigService;
  return new MercadoLibreTokenCipher(config);
}

describe('MercadoLibreTokenCipher', () => {
  it('throws MercadoLibreConfigurationError when the key is missing', () => {
    expect(() => buildCipher(undefined)).toThrow(MercadoLibreConfigurationError);
  });

  it('throws MercadoLibreConfigurationError when the key is too short', () => {
    expect(() => buildCipher('too-short')).toThrow(MercadoLibreConfigurationError);
  });

  it('round-trips a plaintext token through encrypt/decrypt', () => {
    const cipher = buildCipher('a'.repeat(32));
    const encrypted = cipher.encrypt('APP_USR-real-access-token-value');
    expect(encrypted).not.toContain('APP_USR');
    expect(cipher.decrypt(encrypted)).toBe('APP_USR-real-access-token-value');
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const cipher = buildCipher('a'.repeat(32));
    const first = cipher.encrypt('same-value');
    const second = cipher.encrypt('same-value');
    expect(first).not.toBe(second);
  });

  it('fails to decrypt with a different key', () => {
    const cipherA = buildCipher('a'.repeat(32));
    const cipherB = buildCipher('b'.repeat(32));
    const encrypted = cipherA.encrypt('secret-token');
    expect(() => cipherB.decrypt(encrypted)).toThrow();
  });
});
