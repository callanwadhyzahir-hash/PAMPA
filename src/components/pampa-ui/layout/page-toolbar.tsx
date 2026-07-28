import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function PageToolbar({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    />
  );
}

export { PageToolbar };
