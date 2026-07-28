import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageTitleProps = ComponentProps<'div'> & {
  title: string;
  description?: ReactNode;
};

function PageTitle({ title, description, className, ...props }: PageTitleProps) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

export { PageTitle };
export type { PageTitleProps };
