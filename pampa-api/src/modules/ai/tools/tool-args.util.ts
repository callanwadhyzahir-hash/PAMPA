/**
 * Minimal, dependency-free argument validation for tool handlers. Arguments
 * come from model-produced JSON — untrusted shape and untrusted values, even
 * though the *security-sensitive* fields (company_id/user_id) are already
 * stripped upstream by AiGatewayService before a handler ever sees them.
 */
export class InvalidToolArgumentsError extends Error {}

export function asOptionalString(
  args: Record<string, unknown>,
  field: string,
  maxLength = 200,
): string | undefined {
  const value = args[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new InvalidToolArgumentsError(`"${field}" debe ser texto.`);
  }
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

export function asOptionalBoolean(
  args: Record<string, unknown>,
  field: string,
): boolean | undefined {
  const value = args[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'boolean') {
    throw new InvalidToolArgumentsError(`"${field}" debe ser booleano.`);
  }
  return value;
}

export function asOptionalInt(
  args: Record<string, unknown>,
  field: string,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number {
  const value = args[field];
  if (value === undefined || value === null) return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(num)));
}

export function asEnum<T extends string>(
  args: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = args[field];
  if (
    typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
  ) {
    return value as T;
  }
  return fallback;
}
