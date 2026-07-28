import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function FormGrid({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)} {...props} />
  );
}

export { FormGrid };
