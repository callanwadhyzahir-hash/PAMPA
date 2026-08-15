"use client";

import Link from "next/link";
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
  type PlatformCompanyRow,
} from "@/services/platform-admin/platform-admin.service";

type StatusFilter = "ALL" | "ACTIVE" | "SUSPENDED";
type HasUsersFilter = "ALL" | "WITH" | "WITHOUT";
type RecencyFilter = "ALL" | "7" | "30" | "90";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "ACTIVE", label: "Activas" },
  { value: "SUSPENDED", label: "Suspendidas" },
];

const hasUsersFilters: { value: HasUsersFilter; label: string }[] = [
  { value: "ALL", label: "Con o sin usuarios" },
  { value: "WITH", label: "Con usuarios" },
  { value: "WITHOUT", label: "Sin usuarios" },
];

const recencyFilters: { value: RecencyFilter; label: string }[] = [
  { value: "ALL", label: "Cualquier fecha" },
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
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

export default function AdminCompaniesPage() {
  const [items, setItems] = useState<PlatformCompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [hasUsers, setHasUsers] = useState<HasUsersFilter>("ALL");
  const [recency, setRecency] = useState<RecencyFilter>("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function load(
    nextPage = page,
    nextStatus = status,
    nextHasUsers = hasUsers,
    nextRecency = recency,
  ) {
    setLoading(true);
    setError(null);
    try {
      const result = await platformAdminService.listCompanies({
        search: search.trim() || undefined,
        status: nextStatus === "ALL" ? undefined : nextStatus,
        hasUsers: nextHasUsers === "ALL" ? undefined : nextHasUsers,
        createdWithinDays: nextRecency === "ALL" ? undefined : (Number(nextRecency) as 7 | 30 | 90),
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
    const timer = window.setTimeout(() => void load(1, status, hasUsers, recency), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hasUsers, recency]);

  if (loading && items.length === 0 && !error) {
    return <LoadingState label="Cargando empresas" />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-heading-sm font-medium tracking-[-0.02em]">Empresas</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">{total} empresas registradas en PAMPA.</p>
      </div>

      {error ? <ErrorState title="No pudimos cargar las empresas" description={error} /> : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Listado</CardTitle>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void load(1, status, hasUsers, recency);
            }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  className="pl-9"
                  placeholder="Nombre o CUIT"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Buscar empresa"
                />
              </label>
              <Button type="submit" variant="outline" size="sm">
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
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por usuarios">
              {hasUsersFilters.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={hasUsers === filter.value ? "secondary" : "ghost"}
                  aria-pressed={hasUsers === filter.value}
                  onClick={() => setHasUsers(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
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
            <EmptyState title="No hay empresas" description="Ajustá la búsqueda o el filtro de estado." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Sucursales</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Clientes</TableHead>
                    <TableHead>Ventas</TableHead>
                    <TableHead>Última venta</TableHead>
                    <TableHead>Creada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <Link
                          href={`/admin/companies/${company.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {company.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.isActive ? "success" : "danger"}>
                          {company.isActive ? "Activa" : "Suspendida"}
                        </Badge>
                      </TableCell>
                      <TableCell>{company.usersCount}</TableCell>
                      <TableCell>{company.branchesCount}</TableCell>
                      <TableCell>{company.productsCount}</TableCell>
                      <TableCell>{company.clientsCount}</TableCell>
                      <TableCell>{company.salesCount}</TableCell>
                      <TableCell>{company.lastSaleAt ? formatDate(company.lastSaleAt) : "—"}</TableCell>
                      <TableCell>{formatDate(company.createdAt)}</TableCell>
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
