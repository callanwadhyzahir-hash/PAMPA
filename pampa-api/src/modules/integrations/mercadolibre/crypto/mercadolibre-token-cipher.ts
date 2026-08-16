import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MercadoLibreConfigurationError } from '../mercadolibre.errors';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * AES-256-GCM at-rest encryption for mercadolibre_connection access/refresh
 * tokens. The configured secret is hashed to 32 bytes via SHA-256 so any
 * sufficiently long operator-provided value (hex, base64, passphrase) works
 * as the key material.
 */
@Injectable()
export class MercadoLibreTokenCipher {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('MERCADOLIBRE_TOKEN_ENCRYPTION_KEY');
    if (!raw || raw.length < 32) {
      throw new MercadoLibreConfigurationError(
        'MERCADOLIBRE_TOKEN_ENCRYPTION_KEY debe tener al menos 32 caracteres.',
      );
    }
    this.key = createHash('sha256').update(raw).digest();
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const raw = Buffer.from(payload, 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
