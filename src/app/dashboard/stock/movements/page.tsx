'use client';

import { useEffect, useState } from 'react';

import { ErrorState, LoadingState, ProductImage } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/services/api';
import {
  stockService,
  type StockMovement,
} from '@/services/inventory/stock.service';

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    stockService
      .movements()
      .then((rows) => active && setMovements(rows))
      .catch((reason: unknown) => active && setError(errorMessage(reason)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingState label="Cargando movimientos" />;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Movimientos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Historial inmutable de entradas, salidas y transferencias.
        </p>
      </div>
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Historial de stock</CardTitle>
          <CardDescription>Últimos 200 movimientos.</CardDescription>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <ErrorState
              title="No hay movimientos"
              description="Los ajustes, transferencias y ventas aparecerán aquí."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>
                      {new Intl.DateTimeFormat('es-AR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(movement.created_at))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">
                        {movement.movement_type.replaceAll('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ProductImage
                          src={movement.product.image_url}
                          alt={movement.product.name}
                          size="xs"
                        />
                        <div>
                          {movement.product.name}
                          <span className="block text-xs text-muted-foreground">
                            {movement.product.code}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{movement.warehouse.name}</TableCell>
                    <TableCell>
                      {movement.quantity} {movement.product.unit}
                    </TableCell>
                    <TableCell>
                      {movement.user
                        ? `${movement.user.first_name} ${movement.user.last_name}`
                        : 'Sistema'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {movement.reference_code ?? '—'}
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

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'No se pudo cargar el historial.';
}
