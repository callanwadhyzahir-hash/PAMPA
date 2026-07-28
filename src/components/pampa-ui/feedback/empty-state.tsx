import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

function EmptyState({
  title,
  description,
  action,
  icon = <Inbox className="size-6" aria-hidden="true" />,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <div className="rounded-lg bg-muted p-3 text-muted-foreground">{icon}</div>
      <h3 className="mt-4 font-medium">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
