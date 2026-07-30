"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";

import { ErrorState, LoadingState } from "@/components/pampa-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  type ReportsData,
} from "@/services/analytics.service";
import { branchesService } from "@/services/administration/branches.service";
import type { BranchDetail } from "@/services/administration/types";

const localDate = (date: Date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);

export default function ReportsPage() {
  const today = new Date();
  const [from, setFrom] = useState(
    localDate(new Date(today.getFullYear(), today.getMonth(), 1)),
  );
  const [to, setTo] = useState(localDate(today));
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (from > to) {
      setError("La fecha desde no puede ser posterior a la fecha hasta.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsService.reports(from, to, branchId || undefined));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudieron cargar los reportes.",
      );
    } finally {
      setLoading(false);
    }
  }, [branchId, from, to]);

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
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ventas, cobranzas y existencias por período y sucursal.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <DateField label="Desde" value={from} onChange={setFrom} />
          <DateField label="Hasta" value={to} onChange={setTo} />
          <label className="grid gap-1 text-xs text-muted-foreground">
            Sucursal
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm text-foreground"
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            >
              <option value="">Todas</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            onClick={() => data && exportCsv(data, from, to)}
            disabled={!data}
          >
            <Download className="size-4" /> Exportar CSV
          </Button>
        </div>
      </div>
      {loading ? <LoadingState label="Generando reportes" /> : null}
      {error ? (
        <ErrorState title="No se pudo generar el reporte" description={error} />
      ) : null}
      {data && !loading ? <ReportGrid data={data} /> : null}
    </main>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm text-foreground"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ReportGrid({ data }: { data: ReportsData }) {
  const stockRows = (low: boolean) =>
    (low ? data.lowStock : data.stock).map((row) => [
      row.product.name,
      row.warehouse.name,
      `${row.quantity} ${row.product.unit}`,
      row.minimum_quantity,
    ]);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ReportCard
        title="Ventas por período"
        headers={["Fecha", "Operaciones", "Total"]}
        rows={data.salesByPeriod.map((row) => [
          new Date(row.date).toLocaleDateString("es-AR"),
          row.count,
          currency(row.total),
        ])}
      />
      <ReportCard
        title="Ventas por sucursal"
        headers={["Sucursal", "Operaciones", "Total"]}
        rows={data.salesByBranch.map((row) => [
          row.name,
          row.count,
          currency(row.total),
        ])}
      />
      <ReportCard
        title="Ventas por producto"
        headers={["Producto", "Cantidad", "Total"]}
        rows={data.salesByProduct.map((row) => [
          row.productName,
          row.quantity,
          currency(row.total),
        ])}
      />
      <ReportCard
        title="Cobros por método"
        headers={["Método", "Total"]}
        rows={data.paymentsByMethod.map((row) => [
          row.method.replaceAll("_", " "),
          currency(row.total),
        ])}
      />
      <ReportCard
        title="Ventas por cliente"
        headers={["Cliente", "Operaciones", "Total"]}
        rows={data.salesByClient.map((row) => [
          row.clientName,
          row.count,
          currency(row.total),
        ])}
      />
      <ReportCard
        title="Saldos pendientes"
        headers={["Venta", "Cliente", "Saldo"]}
        rows={data.pendingBalances.map((row) => [
          `VTA-${row.saleNumber.padStart(8, "0")}`,
          row.clientName,
          currency(row.balance),
        ])}
      />
      <ReportCard
        className="xl:col-span-2"
        title="Movimientos de stock"
        headers={["Fecha", "Producto", "Depósito", "Tipo", "Cantidad"]}
        rows={data.stockMovements.map((row) => [
          new Date(row.date).toLocaleString("es-AR"),
          `${row.productCode} - ${row.productName}`,
          row.warehouseName,
          row.type.replaceAll("_", " "),
          row.quantity,
        ])}
      />
      <ReportCard
        className="xl:col-span-2"
        title="Stock actual"
        headers={["Producto", "Depósito", "Actual", "Mínimo"]}
        rows={stockRows(false)}
      />
      <ReportCard
        className="xl:col-span-2"
        title="Stock bajo"
        headers={["Producto", "Depósito", "Actual", "Mínimo"]}
        rows={stockRows(true)}
      />
    </div>
  );
}

function ReportCard({
  title,
  headers,
  rows,
  className,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header}>{header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={`${title}-${index}`}>
                {row.map((cell, column) => (
                  <TableCell key={column}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={headers.length}
                  className="py-8 text-center text-muted-foreground"
                >
                  Sin datos para el período.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function exportCsv(data: ReportsData, from: string, to: string) {
  const rows: Array<Array<string | number>> = [
    ["reporte", "detalle", "cantidad", "total"],
  ];
  data.salesByPeriod.forEach((row) =>
    rows.push(["ventas_por_fecha", row.date, row.count, row.total]),
  );
  data.salesByBranch.forEach((row) =>
    rows.push(["ventas_por_sucursal", row.name, row.count, row.total]),
  );
  data.salesByProduct.forEach((row) =>
    rows.push([
      "ventas_por_producto",
      row.productName,
      row.quantity,
      row.total,
    ]),
  );
  data.paymentsByMethod.forEach((row) =>
    rows.push(["cobros_por_metodo", row.method, "", row.total]),
  );
  data.salesByClient.forEach((row) =>
    rows.push(["ventas_por_cliente", row.clientName, row.count, row.total]),
  );
  data.pendingBalances.forEach((row) =>
    rows.push(["saldo_pendiente", row.clientName, row.saleNumber, row.balance]),
  );
  data.stockMovements.forEach((row) =>
    rows.push([
      "movimiento_stock",
      `${row.productCode} - ${row.productName} / ${row.warehouseName}`,
      row.quantity,
      row.type,
    ]),
  );
  data.stock.forEach((row) =>
    rows.push([
      "stock",
      `${row.product.code} - ${row.product.name} / ${row.warehouse.name}`,
      row.quantity,
      "",
    ]),
  );
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pampa-reportes-${from}-${to}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

const csvCell = (value: string | number) =>
  `"${String(value).replaceAll('"', '""')}"`;
const currency = (value: string) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(Number(value));
