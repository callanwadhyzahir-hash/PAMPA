import { Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AiUsageStatus } from "@/services/ai/ai.service";

/**
 * Small, reusable "PAMPA IA" usage indicator. Not the definitive sidebar
 * panel (that's a future sprint) — just a self-contained card any page can
 * drop in once GET /ai/usage is wired to a page. States mirror
 * docs/pampa-ai-architecture.md: <80% normal, >=80% warning, >=95% strong
 * warning, >=100% blocked.
 */
export interface PampaAiWidgetProps {
  status: AiUsageStatus;
  className?: string;
  /** Called when the (currently inert) "Ampliar capacidad" CTA is clicked — no billing exists yet, so this is optional and typically left unset. */
  onRequestUpgrade?: () => void;
}

function planLabel(plan: string | null) {
  switch (plan) {
    case "AI_FREE":
      return "Plan Free";
    case "AI_PRO":
      return "Plan Pro";
    case "AI_BUSINESS":
      return "Plan Business";
    case "CUSTOM":
      return "Plan a medida";
    default:
      return "Sin plan";
  }
}

function renewalLabel(periodEnd: string | null) {
  if (!periodEnd) return null;
  return new Date(periodEnd).toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

export function PampaAiWidget({ status, className, onRequestUpgrade }: PampaAiWidgetProps) {
  if (!status.enabled) {
    return (
      <Card size="sm" className={className}>
        <CardContent className="flex items-center gap-3 py-1">
          <Sparkles className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-foreground">PAMPA IA</p>
            <p className="text-caption text-muted-foreground">No está habilitada para tu empresa.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pct = status.percentageUsed;
  const blocked = pct >= 100;
  const strongWarning = pct >= 95;
  const warning = pct >= 80;

  const barColor = blocked
    ? "bg-destructive"
    : strongWarning
      ? "bg-destructive"
      : warning
        ? "bg-warning"
        : "bg-primary";

  const renewal = renewalLabel(status.periodEnd);

  return (
    <Card size="sm" className={className}>
      <CardContent className="space-y-3 py-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <span className="text-body-sm font-medium text-foreground">PAMPA IA</span>
          </div>
          <span className="text-caption text-muted-foreground">{planLabel(status.plan)}</span>
        </div>

        <div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round(pct))}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-caption text-muted-foreground">
            <span>
              {status.creditsUsed.toLocaleString("es-AR")} / {status.creditsLimit.toLocaleString("es-AR")}{" "}
              créditos
            </span>
            {renewal && <span>Renovación: {renewal}</span>}
          </div>
        </div>

        {blocked ? (
          <div className="rounded-sm bg-destructive-bg px-3 py-2 text-caption text-destructive">
            Alcanzaste el límite mensual de PAMPA IA. El resto de PAMPA continúa funcionando normalmente.
            {onRequestUpgrade && (
              <button
                type="button"
                onClick={onRequestUpgrade}
                className="ml-1 font-medium underline underline-offset-2"
              >
                Ampliar capacidad
              </button>
            )}
          </div>
        ) : strongWarning ? (
          <p className="text-caption text-destructive">
            Estás por alcanzar tu límite mensual de PAMPA IA.
          </p>
        ) : warning ? (
          <p className="text-caption text-warning">Vas usando la mayor parte de tu cuota mensual.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
