"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Boxes,
  CircleDollarSign,
  ShoppingCart,
  Users,
  ArrowRight,
} from "lucide-react";

import { SectionTitle } from "@/components/dashboard/section-title";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageContainer } from "@/components/layout/page-container";
import { ErrorState, LoadingState, ProductImage } from "@/components/pampa-ui";
import { SetupChecklist } from "@/components/onboarding/setup-checklist";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  analyticsService,
  type DashboardMetrics,
} from "@/services/analytics.service";
import { branchesService } from "@/services/administration/branches.service";
import type { BranchDetail } from "@/services/administration/types";
import { saleStatusLabel } from "@/lib/sales-presentation";

export default function DashboardPage() {
  const [range, setRange] = useState("month");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMetrics(
        await analyticsService.dashboard(range, branchId || undefined),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo cargar el dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, range]);

  useEffect(() => {
    branchesService
      .list()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    // The async loader owns loading and error transitions for each filter change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <PageContainer className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <SectionTitle
          size="page"
          eyebrow="PAMPA / Operación"
          title="Centro de comando"
          description="Resumen operativo de ventas, cobros, clientes y stock."
        />
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-sm border border-border bg-card px-3 text-sm text-foreground"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            aria-label="Período"
          >
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="month">Este mes</option>
          </select>
          <select
            className="h-10 rounded-sm border border-border bg-card px-3 text-sm text-foreground"
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            aria-label="Sucursal"
          >
            <option value="">Todas las sucursales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <LoadingState label="Actualizando indicadores" /> : null}
      {error ? (
        <ErrorState
          title="No se pudo cargar el dashboard"
          description={error}
        />
      ) : null}

      {metrics && !loading ? (
        <>
          <section className="rounded-sm border border-border bg-card">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <SectionTitle eyebrow="Herramientas" title="Acciones rápidas" />
                <p className="mt-1 text-body-sm text-muted-foreground">
                  Empezá por una tarea frecuente. Los indicadores de abajo se actualizan con cada operación confirmada.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="default" render={<Link href="/dashboard/products" />}>
                  Nuevo producto
                </Button>
                <Button variant="default" render={<Link href="/dashboard/clients" />}>
                  Nuevo cliente
                </Button>
                <Button variant="outline" render={<Link href="/dashboard/stock" />}>
                  Revisar inventario
                  {metrics.lowStock > 0 ? (
                    <span className="text-warning">({metrics.lowStock})</span>
                  ) : null}
                </Button>
                <Button variant="lime" render={<Link href="/dashboard/sales/new" />}>
                  Registrar venta <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </section>

          <SetupChecklist />

          <section className="space-y-4" data-tour="dashboard-summary">
            <SectionTitle eyebrow="Indicadores" title="Estado operativo del período" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Ventas de hoy"
                value={currency(metrics.salesToday)}
                detail={`${metrics.salesCount} ventas en el período`}
                icon={<ShoppingCart className="size-5" />}
              />
              <StatCard
                label="Ventas del mes"
                value={currency(metrics.salesMonth)}
                detail={`Período: ${currency(metrics.salesPeriod)}`}
                icon={<CircleDollarSign className="size-5" />}
              />
              <StatCard
                label="Cobrado"
                value={currency(metrics.collected)}
                detail={`Pendiente: ${currency(metrics.pending)}`}
                icon={<Banknote className="size-5" />}
              />
              <StatCard
                label="Clientes activos"
                value={metrics.activeClients.toString()}
                detail={`${metrics.activeBranches} sucursales activas`}
                icon={<Users className="size-5" />}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard
                label="Stock bajo"
                value={metrics.lowStock.toString()}
                detail="Productos en mínimo o por debajo"
                icon={<Boxes className="size-5" />}
                tone={metrics.lowStock > 0 ? "warning" : "neutral"}
              />
              <StatCard
                label="Sin stock"
                value={metrics.outOfStock.toString()}
                detail="Existencias en cero"
                icon={<Boxes className="size-5" />}
                tone={metrics.outOfStock > 0 ? "destructive" : "neutral"}
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle eyebrow="Actividad" title="Actividad reciente" />
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas recientes</CardTitle>
                </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venta</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.recentSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <Link
                            className="font-medium hover:underline"
                            href={`/dashboard/sales/${sale.id}`}
                          >
                            VTA-{sale.sale_number.toString().padStart(8, "0")}
                          </Link>
                        </TableCell>
                        <TableCell>{clientName(sale.client)}</TableCell>
                        <TableCell>
                          <Badge variant="info">
                            {saleStatusLabel(sale.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {currency(sale.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {metrics.recentSales.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Todavía no hay ventas.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Movimientos recientes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Depósito</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.recentMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ProductImage
                              src={movement.product.image_url}
                              alt={movement.product.name}
                              size="xs"
                            />
                            {movement.product.name}
                          </div>
                        </TableCell>
                        <TableCell>{movement.warehouse.name}</TableCell>
                        <TableCell>
                          {movement.movement_type.replaceAll("_", " ")}
                        </TableCell>
                        <TableCell className="text-right">
                          {movement.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                    {metrics.recentMovements.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Todavía no hay movimientos.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </div>
          </section>
        </>
      ) : null}
    </PageContainer>
  );
}

function currency(value: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(Number(value));
}

function clientName(client: DashboardMetrics["recentSales"][number]["client"]) {
  if (!client) return "Consumidor final";
  return (
    client.business_name ||
    [client.first_name, client.last_name].filter(Boolean).join(" ") ||
    "Consumidor final"
  );
}
