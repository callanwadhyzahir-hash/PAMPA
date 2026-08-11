import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type StatCardTone = "neutral" | "warning" | "destructive";

const toneIconClass: Record<StatCardTone, string> = {
  neutral: "text-muted-foreground",
  warning: "text-warning",
  destructive: "text-destructive",
};

type StatCardProps = {
  label: string;
  value: string;
  detail?: ReactNode;
  icon?: ReactNode;
  /** Colors only the icon — reserve for genuine alert states (stock bajo/sin stock). */
  tone?: StatCardTone;
};

function StatCard({ label, value, detail, icon, tone = "neutral" }: StatCardProps) {
  return (
    <Card className="gap-0 border py-0 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-body-sm text-muted-foreground">{label}</p>
          {icon && <span className={cn(toneIconClass[tone])}>{icon}</span>}
        </div>
        <p className="mt-3 font-display text-heading-sm font-medium text-foreground">{value}</p>
        {detail && <div className="mt-2 text-caption text-muted-foreground">{detail}</div>}
      </CardContent>
    </Card>
  );
}

export { StatCard };
export type { StatCardTone };
