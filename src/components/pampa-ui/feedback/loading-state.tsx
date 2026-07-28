import { LoaderCircle } from 'lucide-react';

type LoadingStateProps = {
  label?: string;
};

function LoadingState({ label = 'Cargando' }: LoadingStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center" role="status">
      <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export { LoadingState };
export type { LoadingStateProps };
