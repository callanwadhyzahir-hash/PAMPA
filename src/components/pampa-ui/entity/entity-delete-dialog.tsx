'use client';

import { ConfirmDialog } from '../dialogs/confirm-dialog';

type EntityDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
  errorMessage?: string;
};

function EntityDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
  errorMessage,
}: EntityDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel={loading ? 'Eliminando' : 'Eliminar'}
      onConfirm={onConfirm}
      destructive
      loading={loading}
      errorMessage={errorMessage}
    />
  );
}

export { EntityDeleteDialog };
export type { EntityDeleteDialogProps };
