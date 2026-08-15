"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

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

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type VerifiedFilter = "ALL" | "VERIFIED" | "PENDING";
type RoleFilter = "ALL" | "OWNER" | "ADMINISTRATOR";
type RecencyFilter = "ALL" | "7" | "30" | "90";
type SortField = "createdAt" | "lastLoginAt" | "firstName" | "company";
type SortDir = "asc" | "desc";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" },
];

const verifiedFilters: { value: VerifiedFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "VERIFIED", label: "Verificados" },
  { value: "PENDING", label: "Sin verificar" },
];

const roleFilters: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "Cualquier rol" },
  { value: "OWNER", label: "OWNER" },
  { value: "ADMINISTRATOR", label: "Administrador" },
];

const recencyFilters: { value: RecencyFilter; label: string }[] = [
  { value: "ALL", label: "Cualquier fecha" },
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
];

const sortableColumns: { field: SortField; label: string }[] = [
  { field: "firstName", label: "Nombre" },
  { field: "company", label: "Empresa" },
  { field: "lastLoginAt", label: "Último acceso" },
  { field: "createdAt", label: "Creado" },
];

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
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [verified, setVerified] = useState<VerifiedFilter>("ALL");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [neverLoggedIn, setNeverLoggedIn] = useState(false);
  const [recency, setRecency] = useState<RecencyFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function load(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const result = await platformAdminService.listUsers({
        search: search.trim() || undefined,
        status: status === "ALL" ? undefined : status,
        emailVerified: verified === "ALL" ? undefined : verified,
        roleCode: role === "ALL" ? undefined : role,
        neverLoggedIn: neverLoggedIn || undefined,
        createdWithinDays: recency === "ALL" ? undefined : (Number(recency) as 7 | 30 | 90),
        sortBy,
        sortDir,
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
  }, [status, verified, role, neverLoggedIn, recency, sortBy, sortDir]);

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "firstName" || field === "company" ? "asc" : "desc");
    }
  }

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
            className="mt-3 flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void load(1);
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
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
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={status === filter.value ? "secondary" : "ghost"}
                  aria-pressed={status === filter.value}
                  onClick={() => setStatus(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por verificación">
              {verifiedFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={verified === filter.value ? "secondary" : "ghost"}
                  aria-pressed={verified === filter.value}
                  onClick={() => setVerified(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por rol">
              {roleFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={role === filter.value ? "secondary" : "ghost"}
                  aria-pressed={role === filter.value}
                  onClick={() => setRole(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant={neverLoggedIn ? "secondary" : "ghost"}
                aria-pressed={neverLoggedIn}
                onClick={() => setNeverLoggedIn((current) => !current)}
              >
                Nunca inició sesión
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por antigüedad">
              {recencyFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={recency === filter.value ? "secondary" : "ghost"}
                  aria-pressed={recency === filter.value}
                  onClick={() => setRecency(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </form>
        </CardHeader>
        <CardContent>
          {items.length === 0 && !loading ? (
            <EmptyState title="No hay usuarios" description="Ajustá la búsqueda o los filtros." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {sortableColumns.map((column) => (
                      <TableHead key={column.field}>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-left hover:text-foreground"
                          onClick={() => toggleSort(column.field)}
                        >
                          {column.label}
                          {sortBy === column.field ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="size-3.5" aria-hidden />
                            ) : (
                              <ArrowDown className="size-3.5" aria-hidden />
                            )
                          ) : (
                            <ArrowUpDown className="size-3.5 text-muted-foreground/50" aria-hidden />
                          )}
                        </button>
                      </TableHead>
                    ))}
                    <TableHead>Email</TableHead>
                    <TableHead>Verificado</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/admin/users/${row.id}`}
                          className="text-foreground hover:text-primary hover:underline"
                        >
                          {row.firstName} {row.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{row.company.name}</TableCell>
                      <TableCell>{row.lastLoginAt ? formatDate(row.lastLoginAt) : "—"}</TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email}</TableCell>
                      <TableCell>
                        <Badge variant={row.emailVerified ? "success" : "warning"}>
                          {row.emailVerified ? "Verificado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.isActive ? "success" : "danger"}>
                          {row.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
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
