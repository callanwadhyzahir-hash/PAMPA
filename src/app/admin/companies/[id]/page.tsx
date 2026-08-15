"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoaderCircle, ShieldOff, TriangleAlert } from "lucide-react";

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
  type PlatformCompanyDetail,
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

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthSession();
  const [company, setCompany] = useState<PlatformCompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<"suspend" | "reactivate" | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCompany(await platformAdminService.getCompany(params.id));
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

  if (loading) return <LoadingState label="Cargando empresa" />;
  if (error || !company) {
    return <ErrorState title="No pudimos cargar la empresa" description={error ?? "Empresa no encontrada."} />;
  }

  const isOwnCompany = user?.companyId === company.id;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-heading-sm font-medium tracking-[-0.02em]">{company.name}</h1>
            <Badge variant={company.isActive ? "success" : "danger"}>
              {company.isActive ? "Activa" : "Suspendida"}
            </Badge>
          </div>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Creada el {formatDateTime(company.createdAt)}
            {company.taxId ? ` · CUIT ${company.taxId}` : ""}
          </p>
        </div>
        {company.isActive ? (
          isOwnCompany ? (
            <p className="max-w-xs text-caption leading-5 text-muted-foreground">
              No podés suspender la empresa asociada a tu cuenta administrativa.
            </p>
          ) : (
            <Button variant="destructive" onClick={() => setDialogOpen("suspend")}>
              Suspender empresa
            </Button>
          )
        ) : (
          <Button variant="outline" onClick={() => setDialogOpen("reactivate")}>
            Reactivar empresa
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Métricas</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 py-2 sm:grid-cols-3">
            <Metric label="Usuarios" value={company.counts.users} />
            <Metric label="Usuarios activos" value={company.counts.activeUsers} />
            <Metric label="Sucursales" value={company.counts.branches} />
            <Metric label="Depósitos" value={company.counts.warehouses} />
            <Metric label="Productos" value={company.counts.products} />
            <Metric label="Clientes" value={company.counts.clients} />
            <Metric label="Ventas" value={company.counts.sales} />
            <Metric label="Pagos" value={company.counts.payments} />
            <Metric label="Movimientos de stock" value={company.counts.stockMovements} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Propietarios</CardTitle>
        </CardHeader>
        <CardContent>
          {company.owners.length === 0 ? (
            <p className="py-4 text-body-sm text-muted-foreground">
              Esta empresa no tiene un usuario con rol OWNER.
            </p>
          ) : (
            <ul className="divide-y divide-border py-1">
              {company.owners.map((owner) => (
                <li key={owner.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/users/${owner.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {owner.firstName} {owner.lastName}
                    </Link>
                    <p className="truncate text-caption text-muted-foreground">{owner.email}</p>
                  </div>
                  <Badge variant={owner.isActive ? "success" : "danger"}>
                    {owner.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <SuspendDialog
        open={dialogOpen === "suspend"}
        companyName={company.name}
        onOpenChange={(open) => setDialogOpen(open ? "suspend" : null)}
        onDone={() => {
          setDialogOpen(null);
          void load();
        }}
      />
      <ReactivateDialog
        open={dialogOpen === "reactivate"}
        companyName={company.name}
        onOpenChange={(open) => setDialogOpen(open ? "reactivate" : null)}
        onDone={() => {
          setDialogOpen(null);
          void load();
        }}
      />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="text-lg font-medium">{value.toLocaleString("es-AR")}</dd>
    </div>
  );
}

function SuspendDialog({
  open,
  companyName,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  companyName: string;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const params = useParams<{ id: string }>();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setReason("");
      setError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await platformAdminService.updateCompanyStatus(params.id, {
        isActive: false,
        reason: reason.trim() || undefined,
      });
      onDone();
    } catch (reason_) {
      setError(errorMessage(reason_));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="size-4.5 text-destructive" aria-hidden />
            Suspender {companyName}
          </DialogTitle>
          <DialogDescription>
            Los usuarios de esta empresa dejarán de poder operar en PAMPA. Los datos no serán eliminados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="suspend-reason" className="text-sm font-medium">
            Motivo <span className="text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="suspend-reason"
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ej. pago pendiente"
          />
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
          <Button variant="destructive" onClick={() => void confirm()} disabled={submitting}>
            {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Suspender empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReactivateDialog({
  open,
  companyName,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  companyName: string;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const params = useParams<{ id: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await platformAdminService.updateCompanyStatus(params.id, { isActive: true });
      onDone();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-4.5 text-primary" aria-hidden />
            Reactivar {companyName}
          </DialogTitle>
          <DialogDescription>
            Los usuarios de esta empresa van a poder operar en PAMPA nuevamente.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-body-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="lime" onClick={() => void confirm()} disabled={submitting}>
            {submitting && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Reactivar empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
