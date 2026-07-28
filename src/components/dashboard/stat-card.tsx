import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  detail?: ReactNode;
  icon?: ReactNode;
};

function StatCard({ label, value, detail, icon }: StatCardProps) {
  return (
    <Card className="gap-0 border py-0 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-[-0.03em]">{value}</p>
        {detail && <div className="mt-2 text-xs text-muted-foreground">{detail}</div>}
      </CardContent>
    </Card>
  );
}

export { StatCard };
