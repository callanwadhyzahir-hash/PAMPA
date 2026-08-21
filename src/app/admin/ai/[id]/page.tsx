"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/pampa-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/services/api";
import {
  aiAdminService,
  type AiCompanyDetail,
} from "@/services/platform-admin/ai-admin.service";

const PLAN_CODES = ["AI_FREE", "AI_PRO", "AI_BUSINESS", "CUSTOM"] as const;
type PlanCode = (typeof PLAN_CODES)[number];

const PLAN_LABELS: Record<PlanCode, string> = {
  AI_FREE: "Free",
  AI_PRO: "Pro",
  AI_BUSINESS: "Business",
  CUSTOM: "A medida",
};

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "No se pudo completar la operación.";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminAiCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const [company, setCompany] = useState<AiCompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [monthlyCreditLimit, setMonthlyCreditLimit] = useState("");
  const [internalCostLimitUsd, setInternalCostLimitUsd] = useState("");
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const detail = await aiAdminService.getCompany(params.id);
      setCompany(detail);
      setMonthlyCreditLimit(String(detail.creditsLimit));
      setInternalCostLimitUsd(detail.internalCostLimitUsd?.toString() ?? "");
    } catch (reason_) {
      setError(errorMessage(reason_));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function applySettings(patch: {
    enabled?: boolean;
    planCode?: PlanCode;
    monthlyCreditLimit?: number;
    internalCostLimitUsd?: string;
  }) {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await aiAdminService.updateSettings(params.id, {
        ...patch,
        reason: reason.trim() || undefined,
      });
      setCompany(updated);
      setMonthlyCreditLimit(String(updated.creditsLimit));
      setInternalCostLimitUsd(updated.internalCostLimitUsd?.toString() ?? "");
      setReason("");
    } catch (reason_) {
      setSaveError(errorMessage(reason_));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando empresa" />;
  if (error || !company) {
    return <ErrorState title="No pudimos cargar la empresa" description={error ?? "Empresa no encontrada."} />;
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="size-4.5 text-primary" aria-hidden />
            <h1 className="text-heading-sm font-medium tracking-[-0.02em]">{company.companyName}</h1>
            <Badge variant={company.enabled ? "success" : "neutral"}>
              {company.enabled ? "IA habilitada" : "IA deshabilitada"}
            </Badge>
          </div>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Plan {PLAN_LABELS[(company.plan as PlanCode) ?? "AI_FREE"]}
            {company.periodEnd ? ` · período hasta ${formatDateTime(company.periodEnd)}` : ""}
          </p>
        </div>
        <Button
          variant={company.enabled ? "destructive" : "lime"}
          disabled={saving}
          onClick={() => void applySettings({ enabled: !company.enabled })}
        >
          {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {company.enabled ? "Deshabilitar IA" : "Habilitar IA"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Créditos usados" value={company.creditsUsed.toLocaleString("es-AR")} />
        <Metric label="Límite mensual" value={company.creditsLimit.toLocaleString("es-AR")} />
        <Metric label="% consumido" value={`${company.percentageUsed}%`} />
        <Metric label="Costo real estimado" value={`US$ ${company.costUsedPeriodUsd.toFixed(4)}`} />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Plan y límites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 py-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">Plan</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Elegir plan de IA">
              {PLAN_CODES.map((code) => (
                <Button
                  key={code}
                  type="button"
                  size="sm"
                  variant={company.plan === code ? "secondary" : "outline"}
                  aria-pressed={company.plan === code}
                  disabled={saving}
                  onClick={() => void applySettings({ planCode: code })}
                >
                  {PLAN_LABELS[code]}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="credit-limit" className="text-sm font-medium">
                Límite de créditos mensual
              </label>
              <div className="flex gap-2">
                <Input
                  id="credit-limit"
                  type="number"
                  min={0}
                  value={monthlyCreditLimit}
                  onChange={(event) => setMonthlyCreditLimit(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() =>
                    void applySettings({ monthlyCreditLimit: Number(monthlyCreditLimit) || 0 })
                  }
                >
                  Guardar
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cost-limit" className="text-sm font-medium">
                Fusible interno (USD) <span className="text-muted-foreground">— solo Platform Admin</span>
              </label>
              <div className="flex gap-2">
                <Input
                  id="cost-limit"
                  type="number"
                  min={0}
                  step="0.01"
                  value={internalCostLimitUsd}
                  onChange={(event) => setInternalCostLimitUsd(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => void applySettings({ internalCostLimitUsd: internalCostLimitUsd || "0" })}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reason" className="text-sm font-medium">
              Motivo del cambio <span className="text-muted-foreground">(opcional, se audita)</span>
            </label>
            <Input
              id="reason"
              value={reason}
              maxLength={300}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej. plan acordado con el cliente"
            />
          </div>

          {saveError ? (
            <p role="alert" className="text-body-sm text-destructive">
              {saveError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {company.recentUsage.length === 0 ? (
            <p className="py-4 text-body-sm text-muted-foreground">Todavía no hay requests registrados.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Créditos</TableHead>
                  <TableHead>Costo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {company.recentUsage.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                    <TableCell>{entry.model}</TableCell>
                    <TableCell>
                      <Badge variant={entry.status === "SUCCESS" ? "success" : "danger"}>
                        {entry.status === "SUCCESS" ? "Éxito" : entry.errorCode ?? "Error"}
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.totalTokens.toLocaleString("es-AR")}</TableCell>
                    <TableCell>{entry.creditsUsed.toFixed(2)}</TableCell>
                    <TableCell>US$ {entry.estimatedCostUsd.toFixed(4)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="py-1">
        <p className="text-caption text-muted-foreground">{label}</p>
        <p className="text-body-sm font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}
