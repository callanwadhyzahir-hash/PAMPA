import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function DataTableToolbar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    />
  );
}

export { DataTableToolbar };
