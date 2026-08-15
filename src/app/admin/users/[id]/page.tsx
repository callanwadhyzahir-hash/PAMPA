"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ActivityTable } from "@/components/platform-admin/activity-table";
import { ErrorState, LoadingState } from "@/components/pampa-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/services/api";
import {
  platformAdminService,
  type PlatformActivityEvent,
  type PlatformUserDetail,
} from "@/services/platform-admin/platform-admin.service";

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

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<PlatformUserDetail | null>(null);
  const [activity, setActivity] = useState<PlatformActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [detail, activityPage] = await Promise.all([
        platformAdminService.getUser(params.id),
        platformAdminService.listActivity({ userId: params.id, limit: 10 }),
      ]);
      setUser(detail);
      setActivity(activityPage.items);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (loading) return <LoadingState label="Cargando usuario" />;
  if (error || !user) {
    return <ErrorState title="No pudimos cargar el usuario" description={error ?? "Usuario no encontrado."} />;
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-5 sm:p-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-heading-sm font-medium tracking-[-0.02em]">
            {user.firstName} {user.lastName}
          </h1>
          <Badge variant={user.isActive ? "success" : "danger"}>
            {user.isActive ? "Activo" : "Inactivo"}
          </Badge>
          <Badge variant={user.emailVerifiedAt ? "success" : "warning"}>
            {user.emailVerifiedAt ? "Verificado" : "Pendiente de verificar"}
          </Badge>
        </div>
        <p className="mt-1 text-body-sm text-muted-foreground">{user.email}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Identidad</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 py-2">
              <Field label="Empresa">
                <Link
                  href={`/admin/companies/${user.company.id}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {user.company.name}
                </Link>
                {!user.company.isActive ? (
                  <Badge variant="danger" className="ml-2">
                    Suspendida
                  </Badge>
                ) : null}
              </Field>
              <Field label="Sucursal">{user.branch?.name ?? "—"}</Field>
              <Field label="Teléfono">{user.phone ?? "—"}</Field>
              <Field label="Roles">
                {user.roles.length === 0 ? (
                  "—"
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {user.roles.map((role) => (
                      <Badge key={role.id} variant={role.systemCode === "OWNER" ? "active" : "neutral"}>
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </Field>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 py-2">
              <Field label="Email verificado">
                {user.emailVerifiedAt ? formatDateTime(user.emailVerifiedAt) : "Pendiente"}
              </Field>
              <Field label="Último acceso">
                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca inició sesión"}
              </Field>
              <Field label="Creado">{formatDateTime(user.createdAt)}</Field>
              <Field label="Actualizado">{formatDateTime(user.updatedAt)}</Field>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTable
            events={activity}
            showTarget={false}
            showCompany={false}
            emptyMessage="Sin eventos registrados."
          />
        </CardContent>
      </Card>
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
