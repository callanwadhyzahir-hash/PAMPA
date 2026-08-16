import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { MercadoLibreAuthFailedError } from '../mercadolibre.errors';

const ISSUER = 'pampa-api';
const AUDIENCE = 'mercadolibre-oauth-state';
const EXPIRES_IN = '10m';

interface OAuthStatePayload {
  cid: string;
  uid: string;
  nonce: string;
}

export interface OAuthStateClaims {
  companyId: string;
  userId: string;
}

/**
 * Signs/verifies the OAuth `state` param with a short-lived JWT (JWT_SECRET,
 * distinct audience from session tokens). This is what lets the /callback
 * endpoint resolve `companyId` safely — it is never trusted from a query
 * param or the frontend, only from this signature.
 */
@Injectable()
export class MercadoLibreOAuthStateService {
  constructor(private readonly jwt: JwtService) {}

  sign(companyId: string, userId: string): string {
    const payload: OAuthStatePayload = { cid: companyId, uid: userId, nonce: randomUUID() };
    return this.jwt.sign(payload, {
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: EXPIRES_IN,
    });
  }

  verify(token: string): OAuthStateClaims {
    try {
      const payload = this.jwt.verify<OAuthStatePayload>(token, {
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      return { companyId: payload.cid, userId: payload.uid };
    } catch {
      throw new MercadoLibreAuthFailedError('El estado de autorización es inválido o expiró.');
    }
  }
}
