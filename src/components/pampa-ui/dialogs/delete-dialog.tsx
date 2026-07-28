'use client';

import { ConfirmDialog } from './confirm-dialog';

type DeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemLabel: string;
  onConfirm: () => void;
};

function DeleteDialog({ open, onOpenChange, itemLabel, onConfirm }: DeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Eliminar elemento"
      description={`Esta accion eliminara ${itemLabel}. No se puede deshacer.`}
      confirmLabel="Eliminar"
      onConfirm={onConfirm}
      destructive
    />
  );
}

export { DeleteDialog };
export type { DeleteDialogProps };
