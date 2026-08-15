"use client";

import { useEffect, useState } from "react";
import { Boxes, Building2, ContactRound, Gauge, ShoppingCart, Users } from "lucide-react";

import { DailyBarChart } from "@/components/platform-admin/daily-bar-chart";
import { ErrorState, LoadingState } from "@/components/pampa-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/services/api";
import {
  platformAdminService,
  type PlatformGrowthSeries,
  type PlatformOverview,
  type PlatformSecuritySummary,
} from "@/services/platform-admin/platform-admin.service";

type RangeOption = 7 | 30 | 90;

const rangeOptions: { value: RangeOption; label: string }[] = [
  { value: 7, label: "7 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "90 días" },
];

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "No se pudo cargar el resumen de la plataforma.";
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [growth, setGrowth] = useState<PlatformGrowthSeries | null>(null);
  const [security, setSecurity] = useState<PlatformSecuritySummary | null>(null);
  const [range, setRange] = useState<RangeOption>(30);
  const [loading, setLoading] = useState(true);
  const [growthLoading, setGrowthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [overviewResult, securityResult] = await Promise.all([
        platformAdminService.overview(),
        platformAdminService.securitySummary(),
      ]);
      setOverview(overviewResult);
      setSecurity(securityResult);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function loadGrowth(nextRange: RangeOption) {
    setGrowthLoading(true);
    try {
      setGrowth(await platformAdminService.growth(nextRange));
    } catch {
      setGrowth(null);
    } finally {
      setGrowthLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGrowth(range), 0);
    return () => window.clearTimeout(timer);
  }, [range]);

  if (loading) return <LoadingState label="Cargando resumen de la plataforma" />;
  if (error || !overview) {
    return (
      <ErrorState
        title="No pudimos cargar el resumen"
        description={error ?? undefined}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <Card>
        <CardContent className="flex flex-col gap-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface">
              <Gauge className="size-5 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="text-heading-sm font-medium tracking-[-0.02em]">Plataforma</h1>
              <p className="text-body-sm text-muted-foreground">
                {overview.activeCompanies} de {overview.totalCompanies} empresas operando
                {overview.suspendedCompanies > 0 ? ` · ${overview.suspendedCompanies} suspendidas` : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <PrimaryMetric
          icon={Building2}
          label="Empresas"
          value={overview.totalCompanies}
          breakdown={[
            { label: "Activas", value: overview.activeCompanies },
            { label: "Suspendidas", value: overview.suspendedCompanies },
          ]}
        />
        <PrimaryMetric
          icon={Users}
          label="Usuarios"
          value={overview.totalUsers}
          breakdown={[{ label: "Activos", value: overview.activeUsers }]}
        />
      </div>

      <div>
        <h2 className="text-caption font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Operación global
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SecondaryMetric icon={Boxes} label="Productos" value={overview.totalProducts} />
          <SecondaryMetric icon={ContactRound} label="Clientes" value={overview.totalClients} />
          <SecondaryMetric icon={ShoppingCart} label="Ventas" value={overview.totalSales} />
          <SecondaryMetric icon={Building2} label="Sucursales" value={overview.totalBranches} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-caption font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Crecimiento
        </h2>
        <div className="flex gap-1.5" role="group" aria-label="Rango de crecimiento">
          {rangeOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={range === option.value ? "secondary" : "ghost"}
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {growthLoading || !growth ? (
        <Card>
          <CardContent className="py-8 text-center text-body-sm text-muted-foreground">
            Cargando series de crecimiento…
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <GrowthCard
            title="Nuevas empresas"
            total={growth.series.reduce((sum, point) => sum + point.newCompanies, 0)}
            points={growth.series.map((point) => ({ date: point.date, value: point.newCompanies }))}
          />
          <GrowthCard
            title="Nuevos usuarios"
            total={growth.series.reduce((sum, point) => sum + point.newUsers, 0)}
            points={growth.series.map((point) => ({ date: point.date, value: point.newUsers }))}
          />
          <GrowthCard
            title="Logins exitosos"
            total={growth.series.reduce((sum, point) => sum + point.logins, 0)}
            points={growth.series.map((point) => ({ date: point.date, value: point.logins }))}
          />
        </div>
      )}

      {security ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Estado de usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <VerificationBar
              verified={security.users.verified}
              pending={security.users.pendingVerification}
            />
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function GrowthCard({
  title,
  total,
  points,
}: {
  title: string;
  total: number;
  points: { date: string; value: number }[];
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-body-sm">{title}</CardTitle>
        <p className="text-2xl font-medium tracking-[-0.02em]">{total.toLocaleString("es-AR")}</p>
      </CardHeader>
      <CardContent className="pt-4">
        <DailyBarChart points={points} />
      </CardContent>
    </Card>
  );
}

function VerificationBar({ verified, pending }: { verified: number; pending: number }) {
  const total = Math.max(verified + pending, 1);
  const verifiedPct = (verified / total) * 100;
  const pendingPct = 100 - verifiedPct;

  return (
    <div className="space-y-3 py-1">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
        {verified > 0 ? <div className="h-full bg-success" style={{ width: `${verifiedPct}%` }} /> : null}
        {pending > 0 ? <div className="h-full bg-warning" style={{ width: `${pendingPct}%` }} /> : null}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-success" aria-hidden />
          Verificados
          <span className="font-medium text-foreground">{verified.toLocaleString("es-AR")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning" aria-hidden />
          Pendientes
          <span className="font-medium text-foreground">{pending.toLocaleString("es-AR")}</span>
        </span>
      </div>
    </div>
  );
}

function PrimaryMetric({
  icon: Icon,
  label,
  value,
  breakdown,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  breakdown: { label: string; value: number }[];
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 py-2">
        <div>
          <p className="text-caption font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-medium tracking-[-0.02em]">{value.toLocaleString("es-AR")}</p>
          <dl className="mt-3 flex gap-4">
            {breakdown.map((item) => (
              <div key={item.label}>
                <dt className="text-caption text-muted-foreground">{item.label}</dt>
                <dd className="text-body-sm font-medium">{item.value.toLocaleString("es-AR")}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Icon className="size-5 text-muted-foreground" aria-hidden />
      </CardContent>
    </Card>
  );
}

function SecondaryMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3 py-1">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="text-caption text-muted-foreground">{label}</p>
          <p className="text-body-sm font-medium">{value.toLocaleString("es-AR")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
