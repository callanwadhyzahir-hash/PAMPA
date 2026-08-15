"use client";

import { useEffect, useState } from "react";
import {
  KeyRound,
  Mail,
  ShieldAlert,
  UserX,
} from "lucide-react";

import { ActivityTable } from "@/components/platform-admin/activity-table";
import { ErrorState, LoadingState } from "@/components/pampa-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ADMIN_CHANGE_EVENT_TYPES,
  EMAIL_DELIVERY_FAILURE_EVENT_TYPES,
} from "@/services/platform-admin/activity-labels";
import { ApiError } from "@/services/api";
import {
  platformAdminService,
  type PlatformActivityEvent,
  type PlatformSecuritySummary,
} from "@/services/platform-admin/platform-admin.service";

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "No se pudo cargar el centro de seguridad.";
}

export default function AdminSecurityPage() {
  const [summary, setSummary] = useState<PlatformSecuritySummary | null>(null);
  const [failedLogins, setFailedLogins] = useState<PlatformActivityEvent[]>([]);
  const [deliveryFailures, setDeliveryFailures] = useState<PlatformActivityEvent[]>([]);
  const [adminChanges, setAdminChanges] = useState<PlatformActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [summaryResult, failedLoginsResult, deliveryFailuresResult, adminChangesResult] =
        await Promise.all([
          platformAdminService.securitySummary(),
          platformAdminService.listActivity({ eventTypes: ["LOGIN_FAILED"], limit: 10 }),
          platformAdminService.listActivity({
            eventTypes: EMAIL_DELIVERY_FAILURE_EVENT_TYPES,
            limit: 10,
          }),
          platformAdminService.listActivity({ eventTypes: ADMIN_CHANGE_EVENT_TYPES, limit: 10 }),
        ]);
      setSummary(summaryResult);
      setFailedLogins(failedLoginsResult.items);
      setDeliveryFailures(deliveryFailuresResult.items);
      setAdminChanges(adminChangesResult.items);
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

  if (loading) return <LoadingState label="Cargando centro de seguridad" />;
  if (error || !summary) {
    return <ErrorState title="No pudimos cargar el centro de seguridad" description={error ?? undefined} />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-heading-sm font-medium tracking-[-0.02em]">Seguridad</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Estado de verificación de email, autenticación y cambios administrativos en toda PAMPA.
        </p>
      </div>

      <div>
        <h2 className="text-caption font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Usuarios
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={ShieldAlert} label="Pendientes de verificar" value={summary.users.pendingVerification} />
          <Metric icon={UserX} label="Desactivados" value={summary.users.deactivated} />
          <Metric icon={KeyRound} label="Logins fallidos (24h)" value={summary.auth.failedLoginsLast24h} />
          <Metric icon={KeyRound} label="Logins fallidos (7d)" value={summary.auth.failedLoginsLast7d} />
        </div>
      </div>

      <div>
        <h2 className="text-caption font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Email (últimos 7 días)
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={Mail} label="Enviados" value={summary.emails.sentLast7d} />
          <Metric icon={Mail} label="Verificados" value={summary.emails.verifiedLast7d} />
          <Metric icon={Mail} label="Fallos de entrega (7d)" value={summary.emails.deliveryFailuresLast7d} />
          <Metric icon={Mail} label="Fallos de entrega (30d)" value={summary.emails.deliveryFailuresLast30d} />
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Intentos de inicio de sesión fallidos</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTable events={failedLogins} emptyMessage="Sin intentos fallidos recientes." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Fallos de entrega de email</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTable events={deliveryFailures} emptyMessage="Sin fallos de entrega recientes." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Cambios administrativos recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTable events={adminChanges} emptyMessage="Sin cambios administrativos recientes." />
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
  icon: typeof Mail;
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
