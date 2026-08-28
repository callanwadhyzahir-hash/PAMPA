"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";

import { ActivityTable } from "@/components/platform-admin/activity-table";
import { ErrorState, LoadingState } from "@/components/pampa-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthSession } from "@/hooks/use-auth-session";
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
  const router = useRouter();
  const { user: currentUser } = useAuthSession();
  const [user, setUser] = useState<PlatformUserDetail | null>(null);
  const [activity, setActivity] = useState<PlatformActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const isSelf = currentUser?.id === user.id;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
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
        {isSelf ? (
          <p className="max-w-xs text-caption leading-5 text-muted-foreground">
            No podés eliminar tu propia cuenta.
          </p>
        ) : (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden />
            Eliminar usuario
          </Button>
        )}
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

      <DeleteUserDialog
        open={deleteOpen}
        user={user}
        onOpenChange={setDeleteOpen}
        onDone={() => router.push("/admin/users")}
      />
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

function DeleteUserDialog({
  open,
  user,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  user: PlatformUserDetail;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setConfirmText("");
      setReason("");
      setError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const canConfirm = confirmText.trim() === user.email;

  async function confirm() {
    if (submitting || !canConfirm) return;
    setSubmitting(true);
    setError(null);
    try {
      await platformAdminService.deleteUser(user.id, reason.trim() || undefined);
      onDone();
    } catch (reason_) {
      setError(errorMessage(reason_));
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-4.5 text-destructive" aria-hidden />
            Eliminar a {user.firstName} {user.lastName}
          </DialogTitle>
          <DialogDescription>
            Esto borra la cuenta permanentemente. Solo se permite si el usuario no tiene ventas,
            pagos ni movimientos de stock a su nombre — si tiene historial, desactivalo en su
            lugar desde la empresa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="delete-user-confirm" className="text-sm font-medium">
              Escribí <span className="font-mono">{user.email}</span> para confirmar
            </label>
            <Input
              id="delete-user-confirm"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="delete-user-reason" className="text-sm font-medium">
              Motivo <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Input
              id="delete-user-reason"
              value={reason}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej. cuenta de prueba"
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-body-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => void confirm()}
            disabled={submitting || !canConfirm}
          >
            {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Eliminar usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
