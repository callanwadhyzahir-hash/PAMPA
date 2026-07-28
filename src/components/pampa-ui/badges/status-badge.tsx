import { CheckCircle2, CircleDot, CircleX, Clock3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

type StatusBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

type StatusBadgeProps = {
  label: string;
  variant?: StatusBadgeVariant;
};

const statusIcons = {
  default: CircleDot,
  success: CheckCircle2,
  warning: Clock3,
  danger: CircleX,
  info: CircleDot,
};

function StatusBadge({ label, variant = 'default' }: StatusBadgeProps) {
  const Icon = statusIcons[variant];

  return (
    <Badge variant={variant}>
      <Icon className="mr-1 size-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}

export { StatusBadge };
export type { StatusBadgeProps, StatusBadgeVariant };
