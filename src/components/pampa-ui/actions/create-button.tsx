import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

type CreateButtonProps = {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
};

function CreateButton({ label = 'Crear', onClick, disabled }: CreateButtonProps) {
  return (
    <Button type="button" onClick={onClick} disabled={disabled}>
      <Plus className="size-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

export { CreateButton };
export type { CreateButtonProps };
