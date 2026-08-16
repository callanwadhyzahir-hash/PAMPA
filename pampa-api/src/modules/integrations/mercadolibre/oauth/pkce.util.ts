import { createHash, randomBytes } from 'node:crypto';

function base64url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** RFC 7636 PKCE pair. codeVerifier is 64 bytes of randomness, base64url-encoded (86 chars, within the 43-128 spec range). */
export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64url(randomBytes(64));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}
