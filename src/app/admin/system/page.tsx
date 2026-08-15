"use client";

import { useEffect, useState } from "react";
import { Database, GitCommitHorizontal, Mail, Server, Wrench } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/pampa-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/services/api";
import {
  platformAdminService,
  type PlatformComponentStatus,
  type PlatformSystemStatus,
} from "@/services/platform-admin/platform-admin.service";

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "No se pudo cargar el estado del sistema.";
}

const STATUS_LABELS: Record<PlatformComponentStatus, string> = {
  HEALTHY: "Healthy",
  DEGRADED: "Degraded",
  UNAVAILABLE: "Unavailable",
  UNKNOWN: "Unknown",
};

function statusBadgeVariant(status: PlatformComponentStatus) {
  if (status === "HEALTHY") return "success" as const;
  if (status === "DEGRADED") return "warning" as const;
  if (status === "UNAVAILABLE") return "danger" as const;
  return "neutral" as const;
}

function StatusBadge({ status }: { status: PlatformComponentStatus }) {
  return <Badge variant={statusBadgeVariant(status)}>{STATUS_LABELS[status]}</Badge>;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export default function AdminSystemPage() {
  const [status, setStatus] = useState<PlatformSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setStatus(await platformAdminService.systemStatus());
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

  if (loading) return <LoadingState label="Cargando estado del sistema" />;
  if (error || !status) {
    return <ErrorState title="No pudimos cargar el estado del sistema" description={error ?? undefined} />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-heading-sm font-medium tracking-[-0.02em]">Sistema</h1>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Estado de la API, la base de datos y los subsistemas críticos de PAMPA.
          </p>
        </div>
        <StatusBadge status={status.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4 text-muted-foreground" aria-hidden />
              API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 py-2">
              <Field label="Estado">
                <StatusBadge status={status.api.status} />
              </Field>
              <Field label="Uptime del proceso">{formatUptime(status.uptimeSeconds)}</Field>
              <Field label="Environment">{status.environment ?? "—"}</Field>
              <Field label="Versión">{status.version ?? "—"}</Field>
              {status.commit ? <Field label="Commit">{status.commit.slice(0, 12)}</Field> : null}
              <Field label="Hora del servidor">{formatDateTime(status.timestamp)}</Field>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4 text-muted-foreground" aria-hidden />
              Base de datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 py-2">
              <Field label="Estado">
                <StatusBadge status={status.database.status} />
              </Field>
              <Field label="Latencia">
                {status.database.latencyMs !== null ? `${status.database.latencyMs} ms` : "—"}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="size-4 text-muted-foreground" aria-hidden />
              Migraciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 py-2">
              <Field label="Estado">
                <StatusBadge status={status.migrations.status} />
              </Field>
              <Field label="Aplicadas">{status.migrations.appliedCount ?? "—"}</Field>
              <Field label="Última migración">{status.migrations.latestMigration ?? "—"}</Field>
              <Field label="Aplicada el">
                {status.migrations.latestAppliedAt ? formatDateTime(status.migrations.latestAppliedAt) : "—"}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" aria-hidden />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 py-2">
              <Field label="Estado">
                <StatusBadge status={status.email.status} />
              </Field>
              <Field label="Configurado">{status.email.configured ? "Sí" : "No"}</Field>
              <Field label="Fallos de entrega (7d)">{status.email.deliveryFailuresLast7d}</Field>
            </dl>
          </CardContent>
        </Card>
      </div>

      {status.commit ? (
        <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <GitCommitHorizontal className="size-3.5" aria-hidden />
          Build {status.commit}
        </p>
      ) : null}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-body-sm">{children}</dd>
    </div>
  );
}
