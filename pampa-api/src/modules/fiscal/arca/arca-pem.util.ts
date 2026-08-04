import { ArcaConfigurationError } from './arca.errors';

/**
 * Accepts a PEM value in any of the shapes an env var UI is likely to hand
 * us: a real multi-line PEM, a PEM with literal "\n" instead of newlines
 * (common when a platform strips real newlines from env values), or a
 * base64 encoding of either of the above.
 */
export function normalizePem(raw: string | undefined, varName: string): string {
  if (!raw || !raw.trim()) {
    throw new ArcaConfigurationError(`${varName} no está configurada.`);
  }

  let value = raw.trim();
  if (value.includes('\\n')) {
    value = value.replace(/\\n/g, '\n');
  }
  if (value.includes('-----BEGIN')) {
    return value;
  }

  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    if (decoded.includes('-----BEGIN')) {
      return decoded;
    }
  } catch {
    // falls through to the error below
  }

  throw new ArcaConfigurationError(
    `${varName} no tiene un formato PEM reconocible (se acepta PEM directo, PEM con "\\n" escapados, o base64 de un PEM).`,
  );
}
