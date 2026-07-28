import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function PageHeader({ className, ...props }: ComponentProps<'header'>) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
      {...props}
    />
  );
}

export { PageHeader };
