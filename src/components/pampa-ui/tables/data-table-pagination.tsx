import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

type DataTablePaginationProps = {
  page: number;
  pageCount: number;
  onPrevious?: () => void;
  onNext?: () => void;
};

function DataTablePagination({
  page,
  pageCount,
  onPrevious,
  onNext,
}: DataTablePaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Pagina {page} de {pageCount}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onPrevious}
          disabled={page <= 1}
          aria-label="Pagina anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={page >= pageCount}
          aria-label="Pagina siguiente"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export { DataTablePagination };
export type { DataTablePaginationProps };
