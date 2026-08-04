'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { Banknote, Printer } from 'lucide-react';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthSession } from '@/hooks/use-auth-session';
import {
  saleStatusLabel,
  snapshotText,
} from '@/lib/sales-presentation';
import { ApiError } from '@/services/api';
import {
  paymentsService,
  salesService,
  type Sale,
} from '@/services/commercial/sales.service';

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthSession();
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [reference, setReference] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSale(await salesService.get(params.id));
    } catch (reason) {
      setError(message(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function confirm() {
    if (!window.confirm('¿Confirmar la venta y descontar stock?')) return;
    setSaving(true);
    setError(null);
    try {
      setSale(await salesService.confirm(params.id));
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    const reason = window.prompt('Motivo de cancelación');
    if (!reason) return;
    setSaving(true);
    setError(null);
    try {
      setSale(await salesService.cancel(params.id, reason));
    } catch (reasonValue) {
      setError(message(reasonValue));
    } finally {
      setSaving(false);
    }
  }

  async function fiscalize(forceOutcome: 'APPROVED' | 'REJECTED') {
    setSaving(true);
    setError(null);
    try {
      await salesService.fiscalize(params.id, forceOutcome);
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  async function pay(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await paymentsService.create(params.id, {
        items: [
          {
            method,
            amount: Number(amount),
            reference: reference || undefined,
          },
        ],
      });
      setPaymentOpen(false);
      setAmount('');
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !sale) return <LoadingState label="Cargando venta" />;
  if (!sale) {
    return (
      <ErrorState
        title="Venta no disponible"
        description={error ?? 'Venta no encontrada.'}
      />
    );
  }

  const paid = sale.payment
    .filter((payment) => payment.status === 'COMPLETED')
    .reduce((sum, payment) => sum + Number(payment.total), 0);
  const balance = Math.max(0, Number(sale.total) - paid);
  const canConfirm =
    sale.status === 'DRAFT' &&
    (user?.permissions.includes('sales.create') ?? false);
  const canCancel =
    ['CONFIRMED', 'PARTIALLY_PAID', 'PAID'].includes(sale.status) &&
    (user?.permissions.includes('sales.cancel') ?? false);
  const canPay =
    ['CONFIRMED', 'PARTIALLY_PAID'].includes(sale.status) &&
    (user?.permissions.includes('payments.create') ?? false);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <p className="text-sm text-muted-foreground">
            VTA-{sale.sale_number.toString().padStart(8, '0')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Detalle de venta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sale.branch.name} · {sale.warehouse.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConfirm ? (
            <Button disabled={saving} onClick={() => void confirm()}>
              Confirmar venta
            </Button>
          ) : null}
          {canPay ? (
            <Button
              variant="outline"
              onClick={() => {
                setAmount(balance.toFixed(2));
                setPaymentOpen(true);
              }}
            >
              <Banknote className="size-4" />
              Registrar pago
            </Button>
          ) : null}
          {sale.invoice ? (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              Imprimir
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => void cancel()}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Total" value={currency(sale.total)} />
        <Metric label="Pagado" value={currency(String(paid))} />
        <Metric label="Saldo" value={currency(String(balance))} />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Estado</p>
            <Badge className="mt-2" variant="info">
              {saleStatusLabel(sale.status)}
            </Badge>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ítems</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Descuento</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.sale_item.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.product_name}
                    <span className="block text-xs text-muted-foreground">
                      {item.product_code}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.quantity} {item.product.unit}
                  </TableCell>
                  <TableCell>{currency(item.unit_price)}</TableCell>
                  <TableCell>{item.discount_percent}%</TableCell>
                  <TableCell>{currency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {sale.invoice ? (
        <InvoiceView sale={sale} saving={saving} onFiscalize={fiscalize} />
      ) : null}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <form onSubmit={pay}>
            <DialogHeader>
              <DialogTitle>Registrar pago</DialogTitle>
              <DialogDescription>
                Saldo actual: {currency(String(balance))}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <label className="space-y-1.5 text-sm font-medium">
                <span>Método</span>
                <select
                  className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="BANK_TRANSFER">Transferencia bancaria</option>
                  <option value="DEBIT_CARD">Tarjeta de débito</option>
                  <option value="CREDIT_CARD">Tarjeta de crédito</option>
                  <option value="MERCADO_PAGO_MANUAL">
                    Mercado Pago manual
                  </option>
                  <option value="OTHER">Otro</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                <span>Importe</span>
                <Input
                  required
                  type="number"
                  min="0.01"
                  max={balance}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                <span>Referencia</span>
                <Input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                />
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Registrando' : 'Registrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

const FISCAL_STATUS_LABEL: Record<string, string> = {
  NOT_REQUESTED: 'Sin solicitar',
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  ERROR: 'Error',
};

const FISCAL_STATUS_VARIANT: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'info'
> = {
  NOT_REQUESTED: 'default',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  ERROR: 'danger',
};

function fiscalDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-AR');
}

function InvoiceView({
  sale,
  saving,
  onFiscalize,
}: {
  sale: Sale;
  saving: boolean;
  onFiscalize: (forceOutcome: 'APPROVED' | 'REJECTED') => void;
}) {
  const invoice = sale.invoice!;
  const isSimulated = invoice.fiscal_provider === 'MOCK';
  const canFiscalize = invoice.fiscal_status === 'NOT_REQUESTED';
  const companyName =
    snapshotText(invoice.company_snapshot, 'legal_name') ??
    snapshotText(invoice.company_snapshot, 'name') ??
    'Empresa';
  const companyTaxId = snapshotText(invoice.company_snapshot, 'tax_id');
  const companyEmail = snapshotText(invoice.company_snapshot, 'email');
  const companyPhone = snapshotText(invoice.company_snapshot, 'phone');
  const clientPersonName = invoice.client_snapshot
    ? [
        snapshotText(invoice.client_snapshot, 'first_name'),
        snapshotText(invoice.client_snapshot, 'last_name'),
      ]
        .filter(Boolean)
        .join(' ')
    : '';
  const clientBusinessName = snapshotText(
    invoice.client_snapshot,
    'business_name',
  );
  const clientName = invoice.client_snapshot
    ? clientBusinessName || clientPersonName || 'Cliente'
    : 'Consumidor final';
  const clientTaxId = snapshotText(invoice.client_snapshot, 'tax_id');
  return (
    <section className="print-document rounded-xl border bg-white p-6">
      {isSimulated ? (
        <div className="mb-4 rounded-lg border border-danger bg-red-50 p-3 text-center text-sm font-semibold text-danger">
          NO VÁLIDA FISCALMENTE — MODO SIMULACIÓN
        </div>
      ) : null}
      <div className="border-b pb-4 text-center">
        <p className="text-xs font-semibold tracking-wide">
          {invoice.document_label}
        </p>
        <h2 className="mt-2 text-xl font-semibold">{invoice.internal_number}</h2>
      </div>
      <div className="grid gap-4 py-4 text-sm sm:grid-cols-2">
        <div>
          <p className="font-medium">Empresa</p>
          <p className="mt-1 text-muted-foreground">{companyName}</p>
          {companyTaxId ? (
            <p className="text-muted-foreground">CUIT: {companyTaxId}</p>
          ) : null}
          {companyEmail ? (
            <p className="text-muted-foreground">{companyEmail}</p>
          ) : null}
          {companyPhone ? (
            <p className="text-muted-foreground">{companyPhone}</p>
          ) : null}
        </div>
        <div>
          <p className="font-medium">Cliente</p>
          <p className="mt-1 text-muted-foreground">{clientName}</p>
          {clientTaxId ? (
            <p className="text-muted-foreground">
              CUIT/documento: {clientTaxId}
            </p>
          ) : null}
        </div>
      </div>
      <dl className="ml-auto grid max-w-sm grid-cols-2 gap-x-6 gap-y-1 border-t pt-4 text-sm">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="text-right">{currency(sale.subtotal)}</dd>
        <dt className="text-muted-foreground">Descuentos</dt>
        <dd className="text-right">{currency(sale.discount_total)}</dd>
        <dt className="text-muted-foreground">Impuestos</dt>
        <dd className="text-right">{currency(sale.tax_total)}</dd>
        <dt className="pt-2 text-base font-semibold">Total</dt>
        <dd className="pt-2 text-right text-base font-semibold">
          {currency(sale.total)}
        </dd>
      </dl>
      <div className="mt-4 border-t pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Estado fiscal</p>
          <Badge variant={FISCAL_STATUS_VARIANT[invoice.fiscal_status]}>
            {FISCAL_STATUS_LABEL[invoice.fiscal_status] ?? invoice.fiscal_status}
          </Badge>
          {isSimulated ? (
            <Badge variant="warning">Simulado</Badge>
          ) : null}
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <dt className="text-muted-foreground">CAE</dt>
          <dd>{invoice.cae ?? '—'}</dd>
          <dt className="text-muted-foreground">Vencimiento CAE</dt>
          <dd>{fiscalDate(invoice.cae_expiration)}</dd>
          <dt className="text-muted-foreground">Punto de venta</dt>
          <dd>{invoice.point_of_sale ?? '—'}</dd>
          <dt className="text-muted-foreground">Comprobante fiscal</dt>
          <dd>
            {invoice.voucher_type_code && invoice.invoice_number
              ? `${invoice.voucher_type_code}-${invoice.invoice_number}`
              : '—'}
          </dd>
        </dl>
        {invoice.fiscal_status === 'REJECTED' ||
        invoice.fiscal_status === 'ERROR' ? (
          <p className="mt-3 rounded-lg border border-danger bg-red-50 p-2 text-sm text-danger">
            {invoice.arca_error_message ?? 'La fiscalización no pudo completarse.'}
          </p>
        ) : null}
        {canFiscalize ? (
          <div className="mt-4 flex flex-wrap gap-2 print:hidden">
            <Button disabled={saving} onClick={() => onFiscalize('APPROVED')}>
              Fiscalizar (simular aprobación)
            </Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => onFiscalize('REJECTED')}
            >
              Fiscalizar (simular rechazo)
            </Button>
          </div>
        ) : null}
      </div>
    </section>
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

function currency(value: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(Number(value));
}

function message(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'No se pudo completar la operación.';
}
