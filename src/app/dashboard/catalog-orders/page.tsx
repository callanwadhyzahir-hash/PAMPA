'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PackageSearch } from 'lucide-react';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError } from '@/services/api';
import {
  catalogOrdersService,
  type CatalogOrderStatus,
  type CatalogOrderSummary,
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

export default function CatalogOrdersPage() {
  const router = useRouter();
  const { user } = useAuthSession();
  const canRead = user?.permissions.includes('catalog_orders.read') ?? false;

  const [orders, setOrders] = useState<CatalogOrderSummary[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setOrders(await catalogOrdersService.list(status || undefined));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, canRead]);

  if (!canRead) {
    return <ErrorState title="Sin permiso" description="No tenés permiso para ver los pedidos del catálogo." />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <PackageSearch className="size-6 text-primary" aria-hidden="true" />
          Pedidos del catálogo
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedidos que tus clientes enviaron desde el catálogo público. Todavía no son ventas confirmadas.
        </p>
      </div>

      <div className="flex gap-2" data-tour="catalog-orders-filters">
        {[
          { value: '', label: 'Todos' },
          { value: 'PENDING', label: 'Nuevos' },
          { value: 'ACCEPTED', label: 'Aceptados' },
          { value: 'REJECTED', label: 'Rechazados' },
        ].map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={status === option.value ? 'lime' : 'outline'}
            onClick={() => setStatus(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <LoadingState label="Cargando pedidos" />
      ) : error ? (
        <ErrorState description={error} action={<Button onClick={() => void load()}>Reintentar</Button>} />
      ) : orders.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Todavía no llegaron pedidos del catálogo.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Artículos</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/catalog-orders/${order.id}`)}
              >
                <TableCell className="font-medium">
                  PED-{order.order_number.padStart(8, '0')}
                </TableCell>
                <TableCell>
                  {order.customer_name}
                  <span className="block text-xs text-muted-foreground">
                    {order.customer_phone}
                  </span>
                </TableCell>
                <TableCell>{order._count.catalog_order_item}</TableCell>
                <TableCell>${order.total}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[order.status]}>
                    {STATUS_LABEL[order.status]}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(order.created_at).toLocaleString('es-AR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
