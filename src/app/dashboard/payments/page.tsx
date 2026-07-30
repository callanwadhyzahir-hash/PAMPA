'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
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
  paymentsService,
  type Payment,
} from '@/services/commercial/sales.service';
import { useAuthSession } from '@/hooks/use-auth-session';

export default function PaymentsPage() {
  const { user } = useAuthSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  function load() {
    let active = true;
    paymentsService
      .list()
      .then((rows) => active && setPayments(rows))
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
  }

  useEffect(() => {
    return load();
  }, []);

  async function reverse(payment: Payment, mode: 'cancel' | 'refund') {
    const reason = window.prompt(
      mode === 'cancel' ? 'Motivo de anulación' : 'Motivo del reembolso',
    );
    if (!reason) return;
    setSavingId(payment.id);
    setError(null);
    try {
      if (mode === 'cancel') {
        await paymentsService.cancel(payment.id, reason);
      } else {
        await paymentsService.refund(payment.id, reason);
      }
      load();
    } catch (reasonValue) {
      setError(
        reasonValue instanceof Error
          ? reasonValue.message
          : 'No se pudo revertir el pago.',
      );
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <LoadingState label="Cargando pagos" />;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cobros internos, métodos y estado.
        </p>
      </div>
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <CardTitle>Registro de pagos</CardTitle>
            <div className="flex gap-2">
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filtrar por estado"
              >
                <option value="">Todos los estados</option>
                <option value="COMPLETED">Completados</option>
                <option value="CANCELLED">Anulados</option>
                <option value="REFUNDED">Reembolsados</option>
              </select>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                aria-label="Filtrar por método"
              >
                <option value="">Todos los métodos</option>
                <option value="CASH">Efectivo</option>
                <option value="BANK_TRANSFER">Transferencia</option>
                <option value="DEBIT_CARD">Débito</option>
                <option value="CREDIT_CARD">Crédito</option>
                <option value="MERCADO_PAGO_MANUAL">Mercado Pago manual</option>
                <option value="OTHER">Otro</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <ErrorState
              title="No hay pagos"
              description="Los cobros registrados desde una venta aparecerán aquí."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Venta</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments
                  .filter(
                    (payment) =>
                      (!status || payment.status === status) &&
                      (!method ||
                        payment.payment_item.some(
                          (item) => item.payment_method === method,
                        )),
                  )
                  .map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Intl.DateTimeFormat('es-AR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(payment.payment_date))}
                    </TableCell>
                    <TableCell>
                      VTA-
                      {payment.sale?.sale_number.toString().padStart(8, '0')}
                    </TableCell>
                    <TableCell>
                      {payment.sale?.client?.business_name ??
                        [
                          payment.sale?.client?.first_name,
                          payment.sale?.client?.last_name,
                        ]
                          .filter(Boolean)
                          .join(' ') ??
                        'Consumidor final'}
                    </TableCell>
                    <TableCell>
                      {payment.payment_item
                        .map((item) =>
                          item.payment_method.replaceAll('_', ' '),
                        )
                        .join(', ')}
                    </TableCell>
                    <TableCell>{currency(payment.total)}</TableCell>
                    <TableCell>
                      {payment.user
                        ? `${payment.user.first_name} ${payment.user.last_name}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{payment.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/dashboard/sales/${payment.sale_id}`}
                          className={buttonVariants({
                            variant: 'ghost',
                            size: 'sm',
                          })}
                        >
                          Ver venta
                        </Link>
                        {payment.status === 'COMPLETED' &&
                        user?.permissions.includes('payments.refund') ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={savingId === payment.id}
                              onClick={() => void reverse(payment, 'cancel')}
                            >
                              Anular
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={savingId === payment.id}
                              onClick={() => void reverse(payment, 'refund')}
                            >
                              Reembolsar
                            </Button>
                          </>
                        ) : null}
                      </div>
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

function currency(value: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(Number(value));
}
