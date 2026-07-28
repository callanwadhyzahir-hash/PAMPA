import type { ReactNode } from 'react';

type DataTableEmptyProps = {
  title?: string;
  description?: ReactNode;
};

function DataTableEmpty({
  title = 'No hay resultados',
  description = 'No se encontraron elementos para mostrar.',
}: DataTableEmptyProps) {
  return (
    <div className="p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export { DataTableEmpty };
export type { DataTableEmptyProps };
