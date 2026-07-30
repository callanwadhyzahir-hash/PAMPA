'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthSession } from '@/hooks/use-auth-session';
import { salesService, type Sale } from '@/services/commercial/sales.service';

export default function SalesPage() {
  const { user } = useAuthSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canCreate = user?.permissions.includes('sales.create') ?? false;

  useEffect(() => {
    let active = true;
    salesService
      .list()
      .then((rows) => active && setSales(rows))
      .catch((reason: unknown) =>
        active &&
        setError(
          reason instanceof Error ? reason.message : 'No se pudieron cargar.',
        ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingState label="Cargando ventas" />;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Borradores, confirmaciones, pagos y cancelaciones.
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/dashboard/sales/new"
            className={buttonVariants({ variant: 'default' })}
          >
            <Plus className="size-4" />
            Nueva venta
          </Link>
        ) : null}
      </div>
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Operaciones comerciales</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <ErrorState
              title="No hay ventas"
              description="Creá el primer borrador para comenzar."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      VTA-{sale.sale_number.toString().padStart(8, '0')}
                    </TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat('es-AR').format(
                        new Date(sale.sale_date),
                      )}
                    </TableCell>
                    <TableCell>{clientName(sale)}</TableCell>
                    <TableCell>{sale.branch.name}</TableCell>
                    <TableCell>{currency(sale.total)}</TableCell>
                    <TableCell>
                      <Badge variant="info">{sale.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/sales/${sale.id}`}
                        className={buttonVariants({
                          variant: 'ghost',
                          size: 'sm',
                        })}
                      >
                        Ver
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function clientName(sale: Sale) {
  if (!sale.client) return 'Consumidor final';
  return (
    sale.client.business_name ??
    [sale.client.first_name, sale.client.last_name].filter(Boolean).join(' ')
  );
}

function currency(value: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(Number(value));
}
