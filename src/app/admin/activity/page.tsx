"use client";

import { useEffect, useState } from "react";

import { ActivityTable } from "@/components/platform-admin/activity-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/pampa-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LOGIN_ACTIVITY_EVENT_TYPES,
  activityEventLabel,
} from "@/services/platform-admin/activity-labels";
import { ApiError } from "@/services/api";
import {
  platformAdminService,
  type PlatformActivityEvent,
} from "@/services/platform-admin/platform-admin.service";

type ViewFilter = "ALL" | "LOGINS";
type ResultFilter = "ALL" | "SUCCESS" | "FAILURE" | "BLOCKED";

const viewFilters: { value: ViewFilter; label: string }[] = [
  { value: "ALL", label: "Toda la actividad" },
  { value: "LOGINS", label: "Inicios de sesión" },
];

const resultFilters: { value: ResultFilter; label: string }[] = [
  { value: "ALL", label: "Cualquier resultado" },
  { value: "SUCCESS", label: "Éxito" },
  { value: "FAILURE", label: "Falla" },
  { value: "BLOCKED", label: "Bloqueado" },
];

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "No se pudo cargar la actividad de la plataforma.";
}

export default function AdminActivityPage() {
  const [items, setItems] = useState<PlatformActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewFilter>("ALL");
  const [result, setResult] = useState<ResultFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [inspecting, setInspecting] = useState<PlatformActivityEvent | null>(null);

  async function load(nextPage: number, nextView: ViewFilter, nextResult: ResultFilter) {
    setLoading(true);
    setError(null);
    try {
      const response = await platformAdminService.listActivity({
        eventTypes: nextView === "LOGINS" ? LOGIN_ACTIVITY_EVENT_TYPES : undefined,
        result: nextResult === "ALL" ? undefined : nextResult,
        page: nextPage,
      });
      setItems(response.items);
      setPage(response.pagination.page);
      setPages(Math.max(response.pagination.pages, 1));
      setTotal(response.pagination.total);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1, view, result), 0);
    return () => window.clearTimeout(timer);
  }, [view, result]);

  if (loading && items.length === 0 && !error) {
    return <LoadingState label="Cargando actividad" />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-heading-sm font-medium tracking-[-0.02em]">Actividad</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          {total} eventos registrados en la auditoría de PAMPA.
        </p>
      </div>

      {error ? <ErrorState title="No pudimos cargar la actividad" description={error} /> : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Feed de eventos</CardTitle>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por tipo">
              {viewFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={view === filter.value ? "secondary" : "ghost"}
                  aria-pressed={view === filter.value}
                  onClick={() => setView(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por resultado">
              {resultFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={result === filter.value ? "secondary" : "ghost"}
                  aria-pressed={result === filter.value}
                  onClick={() => setResult(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 && !loading ? (
            <EmptyState title="Sin eventos" description="Ajustá los filtros." />
          ) : (
            <>
              <ActivityTable events={items} onInspect={setInspecting} />
              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => void load(page - 1, view, result)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {pages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pages}
                  onClick={() => void load(page + 1, view, result)}
                >
                  Siguiente
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={inspecting !== null} onOpenChange={(open) => !open && setInspecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inspecting ? activityEventLabel(inspecting.eventType) : ""}</DialogTitle>
          </DialogHeader>
          {inspecting ? (
            <pre className="max-h-80 overflow-auto rounded-md border border-border bg-surface p-3 text-xs leading-5 text-muted-foreground">
              {JSON.stringify(
                {
                  id: inspecting.id,
                  eventType: inspecting.eventType,
                  result: inspecting.result,
                  createdAt: inspecting.createdAt,
                  actor: inspecting.actor,
                  target: inspecting.target,
                  company: inspecting.company,
                  metadata: inspecting.metadata,
                },
                null,
                2,
              )}
            </pre>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
