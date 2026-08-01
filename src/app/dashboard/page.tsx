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
  Sparkles,
} from "lucide-react";

import { SectionTitle } from "@/components/dashboard/section-title";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageContainer } from "@/components/layout/page-container";
import { ErrorState, LoadingState } from "@/components/pampa-ui";
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
          title="Dashboard"
          description="Resumen operativo de ventas, cobros, clientes y stock."
        />
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={range}
            onChange={(event) => setRange(event.target.value)}
            aria-label="Período"
          >
            <option value="today">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="month">Este mes</option>
          </select>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
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
          <section className="overflow-hidden rounded-2xl border bg-[#111827] text-white">
            <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-200"><Sparkles className="size-3.5" /> Centro de comando</span>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">¿Qué querés hacer hoy?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Empezá por una tarea frecuente. Los indicadores de abajo se actualizan con cada operación confirmada.</p>
              </div>
              <Button render={<Link href="/dashboard/sales/new" />} size="lg" className="bg-blue-500 hover:bg-blue-600">Registrar venta <ArrowRight className="size-4" /></Button>
            </div>
            <div className="grid border-t border-white/10 sm:grid-cols-3">
              <QuickAction href="/dashboard/products" title="Crear producto" detail="Precio, costo y stock" />
              <QuickAction href="/dashboard/clients" title="Agregar cliente" detail="Datos y cuenta corriente" />
              <QuickAction href="/dashboard/stock" title="Revisar inventario" detail={`${metrics.lowStock} alertas activas`} />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Stock bajo"
              value={metrics.lowStock.toString()}
              detail="Productos en mínimo o por debajo"
              icon={<Boxes className="size-5" />}
            />
            <StatCard
              label="Sin stock"
              value={metrics.outOfStock.toString()}
              detail="Existencias en cero"
              icon={<Boxes className="size-5" />}
            />
          </section>

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
                          <Badge variant="info">{sale.status}</Badge>
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
                        <TableCell>{movement.product.name}</TableCell>
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
        </>
      ) : null}
    </PageContainer>
  );
}

function QuickAction({ href, title, detail }: { href: string; title: string; detail: string }) {
  return <Link href={href} className="flex items-center justify-between border-white/10 px-6 py-4 hover:bg-white/5 sm:border-r last:border-r-0"><span><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-xs text-slate-400">{detail}</span></span><ArrowRight className="size-4 text-slate-400" /></Link>;
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
