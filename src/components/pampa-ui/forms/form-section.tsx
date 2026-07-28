import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type FormSectionProps = ComponentProps<'fieldset'> & {
  title: string;
  description?: ReactNode;
};

function FormSection({
  title,
  description,
  className,
  children,
  ...props
}: FormSectionProps) {
  return (
    <fieldset className={cn('space-y-4', className)} {...props}>
      <legend className="font-medium">{title}</legend>
      {description ? (
        <p className="-mt-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </fieldset>
  );
}

export { FormSection };
export type { FormSectionProps };
