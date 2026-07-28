import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type InfoCardProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

function InfoCard({ title, description, action, children }: InfoCardProps) {
  return (
    <Card className="border py-0 shadow-none">
      <CardHeader className="border-b py-4">
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">{action}</div> : null}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export { InfoCard };
export type { InfoCardProps };
