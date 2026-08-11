"use client";

import { useEffect, useState } from "react";
import { Boxes, Building2, ContactRound, Gauge, ShoppingCart, Users } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/pampa-ui";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/services/api";
import {
  platformAdminService,
  type PlatformOverview,
} from "@/services/platform-admin/platform-admin.service";

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "No se pudo cargar el resumen de la plataforma.";
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOverview(await platformAdminService.overview());
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

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
    </main>
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
