'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Mail, Phone, X } from 'lucide-react';

import { ErrorState, LoadingState, ProductPickerRow } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError } from '@/services/api';
import {
  catalogOrdersService,
  type CatalogOrderDetail,
  type CatalogOrderStatus,
} from '@/services/commercial/catalog-orders.service';

const STATUS_LABEL: Record<CatalogOrderStatus, string> = {
  PENDING: 'Nuevo',
  ACCEPTED: 'Aceptado',
  REJECTED: 'Rechazado',
};

const STATUS_VARIANT: Record<CatalogOrderStatus, 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'danger',
};

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'Ocurrió un error inesperado.';
}

export default function CatalogOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuthSession();
  const canManage = user?.permissions.includes('catalog_orders.manage') ?? false;

  const [order, setOrder] = useState<CatalogOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOrder(await catalogOrdersService.get(params.id));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleAccept() {
    setBusy(true);
    setActionError(null);
    try {
      setOrder(await catalogOrdersService.accept(params.id));
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (reason.trim().length < 3) {
      setActionError('Contá brevemente por qué rechazás el pedido.');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      setOrder(await catalogOrdersService.reject(params.id, reason.trim()));
      setRejecting(false);
    } catch (reason) {
      setActionError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Cargando pedido" />;
  if (error || !order) {
    return (
      <ErrorState
        description={error ?? 'Pedido no encontrado.'}
        action={<Button onClick={() => router.push('/dashboard/catalog-orders')}>Volver</Button>}
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/dashboard/catalog-orders')}>
        <ArrowLeft className="size-4" />
        Pedidos
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Pedido PED-{order.order_number.padStart(8, '0')}
          </h1>
          <p className="text-sm text-muted-foreground">
            Recibido el {new Date(order.created_at).toLocaleString('es-AR')} desde el catálogo{' '}
            {order.catalog.display_name}.
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Artículos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.catalog_order_item.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <ProductPickerRow
                    className="flex-1"
                    imageUrl={item.product.image_url}
                    name={item.product_name}
                    code={item.product_code}
                    meta={
                      item.variant_label
                        ? `${item.variant_label} · x${item.quantity}`
                        : `x${item.quantity}`
                    }
                  />
                  {!item.product.is_active ? (
                    <Badge variant="danger">Producto dado de baja</Badge>
                  ) : null}
                  <span className="w-20 shrink-0 text-right text-sm font-medium">
                    ${item.subtotal}
                  </span>
                </div>
              ))}
              <div className="flex justify-end border-t border-border pt-3 text-sm">
                <div className="w-40 space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${order.subtotal}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${order.total}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {order.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Observaciones del cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{order.customer_name}</p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="size-3.5" /> {order.customer_phone}
              </p>
              {order.customer_email ? (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-3.5" /> {order.customer_email}
                </p>
              ) : null}
              {order.client ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  Vinculado al cliente {order.client.code} en PAMPA.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {order.status === 'ACCEPTED' && order.sale ? (
            <Card>
              <CardHeader>
                <CardTitle>Venta generada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  Este pedido generó la venta VTA-{order.sale.sale_number.padStart(8, '0')}. Gestioná el
                  cobro y la confirmación desde Ventas.
                </p>
                <Button
                  type="button"
                  variant="lime"
                  size="sm"
                  onClick={() => router.push(`/dashboard/sales/${order.sale!.id}`)}
                >
                  Ver venta
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {order.status === 'REJECTED' ? (
            <Card>
              <CardHeader>
                <CardTitle>Motivo de rechazo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.rejection_reason}</p>
              </CardContent>
            </Card>
          ) : null}

          {order.status === 'PENDING' && canManage ? (
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}
                {rejecting ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      placeholder="Ej: sin stock real disponible"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleReject()}
                      >
                        Confirmar rechazo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => setRejecting(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="lime"
                      disabled={busy}
                      onClick={() => void handleAccept()}
                    >
                      <Check className="size-4" />
                      Aceptar pedido
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setRejecting(true)}
                    >
                      <X className="size-4" />
                      Rechazar
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Aceptar crea una venta en borrador con estos productos. El stock se descuenta recién
                  cuando confirmes esa venta.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
