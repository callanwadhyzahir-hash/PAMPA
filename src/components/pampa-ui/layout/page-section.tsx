import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageSectionProps = ComponentProps<'section'> & {
  title?: string;
  description?: ReactNode;
};

function PageSection({
  title,
  description,
  className,
  children,
  ...props
}: PageSectionProps) {
  return (
    <section className={cn('space-y-4', className)} {...props}>
      {title ? (
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export { PageSection };
export type { PageSectionProps };
