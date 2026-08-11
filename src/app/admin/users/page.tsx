"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

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
  platformAdminService,
  type PlatformUserRow,
} from "@/services/platform-admin/platform-admin.service";

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "No se pudo completar la operación.";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminUsersPage() {
  const [items, setItems] = useState<PlatformUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function load(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const result = await platformAdminService.listUsers({
        search: search.trim() || undefined,
        page: nextPage,
      });
      setItems(result.items);
      setPage(result.pagination.page);
      setPages(Math.max(result.pagination.pages, 1));
      setTotal(result.pagination.total);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && items.length === 0 && !error) {
    return <LoadingState label="Cargando usuarios" />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-heading-sm font-medium tracking-[-0.02em]">Usuarios</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">{total} usuarios en toda la plataforma.</p>
      </div>

      {error ? <ErrorState title="No pudimos cargar los usuarios" description={error} /> : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Listado</CardTitle>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void load(1);
            }}
          >
            <label className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="pl-9"
                placeholder="Nombre o correo"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar usuario"
              />
            </label>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {items.length === 0 && !loading ? (
            <EmptyState title="No hay usuarios" description="Ajustá la búsqueda." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Verificado</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead>Creado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.firstName} {row.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.email}</TableCell>
                      <TableCell>
                        <Badge variant={row.emailVerified ? "success" : "warning"}>
                          {row.emailVerified ? "Verificado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.company.name}</TableCell>
                      <TableCell>
                        <Badge variant={row.isActive ? "success" : "danger"}>
                          {row.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.lastLoginAt ? formatDate(row.lastLoginAt) : "—"}</TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => void load(page - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {pages}
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
