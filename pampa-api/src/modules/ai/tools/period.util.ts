export const SALES_PERIODS = [
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'this_month',
  'custom',
] as const;
export type SalesPeriod = (typeof SALES_PERIODS)[number];

export interface ResolvedPeriod {
  label: string;
  from: Date;
  to: Date;
}

const MAX_CUSTOM_RANGE_DAYS = 366;

export class InvalidPeriodError extends Error {}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Resolves a tool-facing period argument into a concrete [from, to) range.
 * `custom` is validated defensively — the range comes from model-produced
 * arguments, never trusted as-is (see docs/pampa-ai-architecture.md §Seguridad).
 */
export function resolvePeriod(
  period: SalesPeriod,
  customFrom?: string,
  customTo?: string,
): ResolvedPeriod {
  const now = new Date();
  const today = startOfDay(now);

  switch (period) {
    case 'today':
      return { label: 'hoy', from: today, to: now };
    case 'yesterday': {
      const from = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return { label: 'ayer', from, to: today };
    }
    case 'last_7_days':
      return {
        label: 'últimos 7 días',
        from: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        to: now,
      };
    case 'last_30_days':
      return {
        label: 'últimos 30 días',
        from: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        to: now,
      };
    case 'this_month':
      return {
        label: 'este mes',
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: now,
      };
    case 'custom': {
      if (!customFrom || !customTo) {
        throw new InvalidPeriodError(
          'El período "custom" requiere customFrom y customTo (YYYY-MM-DD).',
        );
      }
      const from = new Date(`${customFrom}T00:00:00`);
      const to = new Date(`${customTo}T23:59:59.999`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw new InvalidPeriodError(
          'customFrom/customTo deben ser fechas válidas (YYYY-MM-DD).',
        );
      }
      if (from > to) {
        throw new InvalidPeriodError(
          'customFrom no puede ser posterior a customTo.',
        );
      }
      const rangeDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
      if (rangeDays > MAX_CUSTOM_RANGE_DAYS) {
        throw new InvalidPeriodError(
          `El rango máximo permitido es de ${MAX_CUSTOM_RANGE_DAYS} días.`,
        );
      }
      return { label: `${customFrom} a ${customTo}`, from, to };
    }
  }
}
