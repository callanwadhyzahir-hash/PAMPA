import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function EntityForm({ className, ...props }: ComponentProps<'form'>) {
  return <form className={cn('space-y-5', className)} {...props} />;
}

export { EntityForm };
