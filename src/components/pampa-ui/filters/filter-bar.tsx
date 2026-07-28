import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function FilterBar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    />
  );
}

export { FilterBar };
