import type { Availability } from '@/services/storefront/storefront.service';

const LABEL: Record<NonNullable<Availability>, string> = {
  AVAILABLE: 'Disponible',
  LOW_STOCK: 'Últimas unidades',
  OUT_OF_STOCK: 'Sin stock',
};

const CLASS: Record<NonNullable<Availability>, string> = {
  AVAILABLE: 'bg-success-bg text-success',
  LOW_STOCK: 'bg-warning-bg text-warning',
  OUT_OF_STOCK: 'bg-destructive-bg text-destructive',
};

function AvailabilityBadge({ availability }: { availability: Availability }) {
  if (!availability) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${CLASS[availability]}`}
    >
      {LABEL[availability]}
    </span>
  );
}

export { AvailabilityBadge };
