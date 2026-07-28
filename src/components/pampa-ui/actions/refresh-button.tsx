import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';

type RefreshButtonProps = {
  label?: string;
  onClick?: () => void;
  loading?: boolean;
};

function RefreshButton({ label = 'Actualizar', onClick, loading = false }: RefreshButtonProps) {
  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={loading}>
      <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
      {label}
    </Button>
  );
}

export { RefreshButton };
export type { RefreshButtonProps };
