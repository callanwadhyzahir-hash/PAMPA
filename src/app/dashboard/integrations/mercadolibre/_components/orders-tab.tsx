'use client';

import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/pampa-ui/feedback/empty-state';
import {
  mercadolibreService,
  type MercadoLibreOrder,
} from '@/services/integrations/mercadolibre.service';

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  paid: 'success',
  confirmed: 'info',
  payment_required: 'warning',
  cancelled: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  paid: 'Pagada',
  confirmed: 'Confirmada',
  payment_required: 'Pago pendiente',
  cancelled: 'Cancelada',
};

const currency = (value: string, currencyId: string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: currencyId || 'ARS' }).format(
    Number(value),
  );

function OrdersTab() {
  const [items, setItems] = useState<MercadoLibreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    mercadolibreService
      .listOrders({ limit: 50 })
      .then((page) => setItems(page.items))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Cargando órdenes…</p>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin órdenes"
        description="Ejecutá una sincronización para traer las órdenes de Mercado Libre."
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Solo se muestran las órdenes de Mercado Libre. Todavía no se convierten
        automáticamente en ventas de PAMPA.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden ML</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Comprador</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">{order.ml_order_id}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(
                  new Date(order.date_created),
                )}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[order.status] ?? 'neutral'}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </Badge>
              </TableCell>
              <TableCell>{currency(order.total_amount, order.currency_id)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {order.buyer_nickname ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export { OrdersTab };
