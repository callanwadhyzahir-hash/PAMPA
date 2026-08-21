"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Ban,
  Bot,
  Coins,
  DollarSign,
  Gauge,
  Search,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";

import { EmptyState, ErrorState, LoadingState } from "@/components/pampa-ui";
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
  type AiCompanySummary,
  type AiOverview,
} from "@/services/platform-admin/ai-admin.service";

type EnabledFilter = "ALL" | "ENABLED" | "DISABLED";

const enabledFilters: { value: EnabledFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "ENABLED", label: "IA habilitada" },
  { value: "DISABLED", label: "IA deshabilitada" },
];

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "No se pudo completar la operación.";
}

function planLabel(plan: string | null) {
  switch (plan) {
    case "AI_FREE":
      return "Free";
    case "AI_PRO":
      return "Pro";
    case "AI_BUSINESS":
      return "Business";
    case "CUSTOM":
      return "A medida";
    default:
      return "—";
  }
}

export default function AdminAiPage() {
  const [overview, setOverview] = useState<AiOverview | null>(null);
  const [items, setItems] = useState<AiCompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [enabled, setEnabled] = useState<EnabledFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function load(nextPage = page, nextEnabled = enabled) {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, companiesResult] = await Promise.all([
        aiAdminService.overview(),
        aiAdminService.listCompanies({
          search: search.trim() || undefined,
          enabled: nextEnabled === "ALL" ? undefined : nextEnabled === "ENABLED",
          page: nextPage,
        }),
      ]);
      setOverview(overviewResult);
      setItems(companiesResult.items);
      setPage(companiesResult.pagination.page);
      setPages(Math.max(companiesResult.pagination.pages, 1));
      setTotal(companiesResult.pagination.total);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1, enabled), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (loading && items.length === 0 && !error) {
    return <LoadingState label="Cargando PAMPA IA" />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-heading-sm font-medium tracking-[-0.02em]">PAMPA IA</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Consumo, costos y cuotas de PAMPA IA en toda la plataforma.
        </p>
      </div>

      {error ? <ErrorState title="No pudimos cargar PAMPA IA" description={error} /> : null}

      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric icon={Sparkles} label="Empresas con IA" value={overview.companiesWithAiEnabled} />
          <Metric icon={Ban} label="Bloqueadas por cuota" value={overview.companiesBlockedByQuota} />
          <Metric icon={Bot} label={`Requests (${overview.periodDays}d)`} value={overview.requests} />
          <Metric icon={Coins} label="Créditos consumidos" value={overview.creditsConsumed} />
          <Metric
            icon={DollarSign}
            label="Costo API estimado"
            value={`US$ ${overview.estimatedCostUsd.toFixed(2)}`}
          />
          <Metric icon={Bot} label="Tokens totales" value={overview.totalTokens} />
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric icon={Wrench} label="Tool calls" value={overview.toolCalls} />
          <Metric icon={Gauge} label="Tokens prom./request" value={overview.averageTokensPerRequest} />
          <Metric
            icon={DollarSign}
            label="Costo prom./request"
            value={`US$ ${overview.averageCostPerRequestUsd.toFixed(5)}`}
          />
          <Metric icon={ShieldAlert} label="Errores del proveedor" value={overview.providerErrors} />
          <Metric icon={Gauge} label="Rate limited" value={overview.rateLimitedRequests} />
          <Metric icon={Ban} label="Bloqueos por cuota" value={overview.quotaBlockedRequests} />
        </div>
      )}

      {overview && overview.topTools.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Tools más usadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border py-1">
              {overview.topTools.map((entry) => (
                <li key={entry.tool} className="flex items-center justify-between py-2">
                  <span className="text-body-sm text-foreground">{entry.tool}</span>
                  <span className="text-body-sm text-muted-foreground">
                    {entry.count.toLocaleString("es-AR")} llamadas
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Empresas</CardTitle>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void load(1, enabled);
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  className="pl-9"
                  placeholder="Nombre de empresa"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Buscar empresa"
                />
              </label>
              <Button type="submit" variant="outline" size="sm">
                Buscar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado de IA">
              {enabledFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={enabled === filter.value ? "secondary" : "ghost"}
                  aria-pressed={enabled === filter.value}
                  onClick={() => setEnabled(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </form>
        </CardHeader>
        <CardContent>
          {items.length === 0 && !loading ? (
            <EmptyState title="No hay empresas" description="Ajustá la búsqueda o el filtro de estado." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Créditos usados</TableHead>
                    <TableHead>Límite</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Costo estimado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((company) => (
                    <TableRow key={company.companyId}>
                      <TableCell>
                        <Link
                          href={`/admin/ai/${company.companyId}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {company.companyName}
                        </Link>
                      </TableCell>
                      <TableCell>{planLabel(company.plan)}</TableCell>
                      <TableCell>
                        <Badge variant={company.enabled ? "success" : "neutral"}>
                          {company.enabled ? "Habilitada" : "Deshabilitada"}
                        </Badge>
                      </TableCell>
                      <TableCell>{company.creditsUsed.toLocaleString("es-AR")}</TableCell>
                      <TableCell>{company.creditsLimit.toLocaleString("es-AR")}</TableCell>
                      <TableCell>
                        <Badge variant={company.percentageUsed >= 100 ? "danger" : company.percentageUsed >= 80 ? "warning" : "neutral"}>
                          {company.percentageUsed}%
                        </Badge>
                      </TableCell>
                      <TableCell>{company.requests.toLocaleString("es-AR")}</TableCell>
                      <TableCell>{company.totalTokens.toLocaleString("es-AR")}</TableCell>
                      <TableCell>US$ {company.estimatedCostUsd.toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => void load(page - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {pages} · {total} empresas
                </span>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => void load(page + 1)}>
                  Siguiente
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles;
  label: string;
  value: number | string;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3 py-1">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="text-caption text-muted-foreground">{label}</p>
          <p className="text-body-sm font-medium">
            {typeof value === "number" ? value.toLocaleString("es-AR") : value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
