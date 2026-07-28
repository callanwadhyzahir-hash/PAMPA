import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';

type ErrorStateProps = {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
};

function ErrorState({
  title = 'No se pudo completar la accion',
  description = 'Intenta nuevamente en unos instantes.',
  action,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
      <CircleAlert className="size-6 text-destructive" aria-hidden="true" />
      <h3 className="mt-3 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export { ErrorState };
export type { ErrorStateProps };
