'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  clientsService,
  type Client,
  type ClientAccount,
  type ClientSale,
} from '@/services/commercial/clients.service';

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [sales, setSales] = useState<ClientSale[]>([]);
  const [account, setAccount] = useState<ClientAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      clientsService.get(params.id),
      clientsService.sales(params.id),
      clientsService.account(params.id),
    ])
      .then(([clientValue, salesValue, accountValue]) => {
        if (!active) return;
        setClient(clientValue);
        setSales(salesValue);
        setAccount(accountValue);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'No se pudo cargar el cliente.',
          );
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params.id]);

  if (loading) return <LoadingState label="Cargando cliente" />;
  if (!client || error) {
    return (
      <ErrorState
        title="No se pudo cargar el cliente"
        description={error ?? 'Cliente no encontrado.'}
      />
    );
  }

  const currency = (value: string) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(Number(value));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{client.code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {client.business_name ??
              [client.first_name, client.last_name].filter(Boolean).join(' ')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {client.tax_id ?? 'Sin identificación fiscal'} ·{' '}
            {client.email ?? 'Sin correo'}
          </p>
        </div>
        <Button variant="outline">
          <Link href="/dashboard/clients">Volver</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Ventas" value={currency(account?.salesTotal ?? '0')} />
        <Metric label="Cobrado" value={currency(account?.paidTotal ?? '0')} />
        <Metric label="Saldo" value={currency(account?.balance ?? '0')} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de ventas y pagos</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <ErrorState
              title="Sin operaciones"
              description="Este cliente todavía no tiene ventas."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>VTA-{sale.sale_number}</TableCell>
                    <TableCell>
                      {new Intl.DateTimeFormat('es-AR').format(
                        new Date(sale.sale_date),
                      )}
                    </TableCell>
                    <TableCell>{sale.branch.name}</TableCell>
                    <TableCell>{currency(sale.total)}</TableCell>
                    <TableCell>
                      {currency(
                        sale.payment
                          .reduce(
                            (total, payment) => total + Number(payment.total),
                            0,
                          )
                          .toString(),
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{sale.status}</Badge>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
