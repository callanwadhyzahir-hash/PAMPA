'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeftRight, Boxes, Camera, ScanLine, SlidersHorizontal } from 'lucide-react';

import { BarcodeCameraDialog } from '@/components/barcode';
import { ErrorState, LoadingState, ProductImage } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { useBarcodeEntry } from '@/hooks/use-barcode-entry';
import { ApiError } from '@/services/api';
import {
  productsService,
  type Product,
} from '@/services/catalog/products.service';
import {
  stockService,
  type StockRow,
  type StockSummary,
} from '@/services/inventory/stock.service';
import {
  warehousesService,
  type Warehouse,
} from '@/services/inventory/warehouses.service';

type Action = 'adjust' | 'transfer' | null;

export default function StockPage() {
  const { user } = useAuthSession();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [summary, setSummary] = useState<StockSummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [targetWarehouseId, setTargetWarehouseId] = useState('');
  const [movementType, setMovementType] =
    useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const canAdjust = user?.permissions.includes('stock.adjust') ?? false;
  const canTransfer = user?.permissions.includes('stock.transfer') ?? false;
  const selectedProduct = products.find((product) => product.id === productId);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [stockRows, stockSummary, productPage, warehouseRows] =
        await Promise.all([
          stockService.list(),
          stockService.summary(),
          productsService.list({ isActive: true, limit: 100 }),
          warehousesService.list(),
        ]);
      setRows(stockRows);
      setSummary(stockSummary);
      setProducts(
        productPage.items.filter(
          (product) => product.tracks_stock && product.is_active,
        ),
      );
      setWarehouses(
        warehouseRows.filter((warehouse) => warehouse.is_active),
      );
    } catch (reasonValue) {
      setError(errorMessage(reasonValue));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function resetAction(next: Action) {
    setAction(next);
    setProductId('');
    setWarehouseId('');
    setTargetWarehouseId('');
    setMovementType('ADJUSTMENT_IN');
    setQuantity('');
    setReason('');
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (action === 'adjust') {
        await stockService.adjust({
          productId,
          warehouseId,
          movementType,
          quantity: Number(quantity),
          reason,
        });
      } else {
        await stockService.transfer({
          productId,
          sourceWarehouseId: warehouseId,
          targetWarehouseId,
          quantity: Number(quantity),
          reason,
        });
      }
      setAction(null);
      await load();
    } catch (reasonValue) {
      setError(errorMessage(reasonValue));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !summary) return <LoadingState label="Cargando stock" />;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Saldos actuales por producto y depósito.
          </p>
        </div>
        <div className="flex gap-2">
          {canAdjust ? (
            <Button variant="outline" onClick={() => setScanOpen(true)}>
              <ScanLine className="size-4" aria-hidden />
              Escanear producto
            </Button>
          ) : null}
          {canAdjust ? (
            <Button variant="outline" onClick={() => resetAction('adjust')}>
              <SlidersHorizontal className="size-4" aria-hidden />
              Ajustar
            </Button>
          ) : null}
          {canTransfer ? (
            <Button onClick={() => resetAction('transfer')}>
              <ArrowLeftRight className="size-4" aria-hidden />
              Transferir
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Productos" value={summary?.products ?? 0} />
        <Metric label="Unidades" value={summary?.units ?? '0'} />
        <Metric label="Depósitos" value={summary?.warehouses ?? 0} />
        <Metric label="Stock bajo" value={summary?.lowStock ?? 0} warning />
        <Metric label="Sin stock" value={summary?.outOfStock ?? 0} warning />
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Posiciones de stock</CardTitle>
          <CardDescription>
            Cada saldo se actualiza únicamente mediante un movimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <ErrorState
              title="Todavía no hay stock"
              description="Registrá un ingreso inicial o ajuste para comenzar."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const low = Number(row.quantity) <= Number(row.minimum_quantity);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ProductImage
                            src={row.product.image_url}
                            alt={row.product.name}
                            size="sm"
                          />
                          <div>
                            <p className="font-medium">{row.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {row.product.code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{row.warehouse.name}</TableCell>
                      <TableCell>{row.warehouse.branch.name}</TableCell>
                      <TableCell>
                        {row.quantity} {row.product.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant={low ? 'warning' : 'success'}>
                          {Number(row.quantity) === 0
                            ? 'Sin stock'
                            : low
                              ? 'Stock bajo'
                              : 'Disponible'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(action)} onOpenChange={() => setAction(null)}>
        <DialogContent>
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>
                {action === 'adjust' ? 'Ajustar stock' : 'Transferir stock'}
              </DialogTitle>
              <DialogDescription>
                La operación genera movimientos inmutables y auditables.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <SelectField
                label="Producto"
                value={productId}
                onChange={setProductId}
                options={products.map((product) => ({
                  value: product.id,
                  label: `${product.name} · ${product.code}`,
                }))}
              />
              {selectedProduct ? (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                  <ProductImage
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium">{selectedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedProduct.code} · Stock actual{' '}
                      {selectedProduct.total_stock} {selectedProduct.unit}
                    </p>
                  </div>
                </div>
              ) : null}
              <SelectField
                label={action === 'transfer' ? 'Depósito de origen' : 'Depósito'}
                value={warehouseId}
                onChange={setWarehouseId}
                options={warehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: `${warehouse.name} · ${warehouse.branch.name}`,
                }))}
              />
              {action === 'transfer' ? (
                <SelectField
                  label="Depósito de destino"
                  value={targetWarehouseId}
                  onChange={setTargetWarehouseId}
                  options={warehouses
                    .filter((warehouse) => warehouse.id !== warehouseId)
                    .map((warehouse) => ({
                      value: warehouse.id,
                      label: `${warehouse.name} · ${warehouse.branch.name}`,
                    }))}
                />
              ) : (
                <label className="space-y-1.5 text-sm font-medium">
                  <span>Tipo</span>
                  <select
                    className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                    value={movementType}
                    onChange={(event) =>
                      setMovementType(
                        event.target.value as typeof movementType,
                      )
                    }
                  >
                    <option value="ADJUSTMENT_IN">Ingreso</option>
                    <option value="ADJUSTMENT_OUT">Egreso</option>
                  </select>
                </label>
              )}
              <label className="space-y-1.5 text-sm font-medium">
                <span>Cantidad</span>
                <Input
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                <span>Motivo</span>
                <Input
                  required
                  minLength={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAction(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Procesando' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <QuickScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        warehouses={warehouses}
        onAdjusted={load}
      />
    </main>
  );
}

function QuickScanDialog({
  open,
  onOpenChange,
  warehouses,
  onAdjusted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Warehouse[];
  onAdjusted: () => Promise<void>;
}) {
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [movementType, setMovementType] =
    useState<'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT'>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Ajuste por escaneo');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setProduct(null);
    setQuantity('');
    setWarehouseId('');
    setMovementType('ADJUSTMENT_IN');
    setReason('Ajuste por escaneo');
  }

  async function resolveBarcode(value: string) {
    setError(null);
    try {
      // Exact tenant-scoped backend lookup, same contract as Ventas.
      const found = await productsService.findByBarcode(value);
      if (!found.tracks_stock) {
        setError(`${found.name} no controla stock.`);
        return;
      }
      resetForm();
      setProduct(found);
    } catch {
      setError('No se encontró un producto con este código de barras.');
    }
  }

  const barcodeEntry = useBarcodeEntry({
    value: barcode,
    onScan: async (value) => {
      await resolveBarcode(value);
      setBarcode('');
    },
    inputRef,
    disabled: saving,
  });

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      await stockService.adjust({
        productId: product.id,
        warehouseId,
        movementType,
        quantity: Number(quantity),
        reason,
      });
      await onAdjusted();
      resetForm();
      inputRef.current?.focus();
    } catch (reasonValue) {
      setError(errorMessage(reasonValue));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          resetForm();
          setBarcode('');
          setError(null);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escanear producto</DialogTitle>
          <DialogDescription>
            Escaneá con el lector USB o la cámara para ajustar stock sin
            buscar el producto manualmente. La cantidad siempre se confirma
            antes de aplicar el ajuste.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              autoFocus
              placeholder="Escanear código de barras"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={barcodeEntry.onKeyDown}
              disabled={saving}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Escanear con cámara"
              onClick={() => setCameraOpen(true)}
            >
              <Camera className="size-4" aria-hidden />
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {product ? (
            <form onSubmit={confirm} className="space-y-3 rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <ProductImage src={product.image_url} alt={product.name} size="lg" />
                <div>
                  <p className="font-medium">Producto encontrado</p>
                  <p className="text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.code} · Stock actual {product.total_stock}{' '}
                    {product.unit}
                  </p>
                </div>
              </div>
              <SelectField
                label="Depósito"
                value={warehouseId}
                onChange={setWarehouseId}
                options={warehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: `${warehouse.name} · ${warehouse.branch.name}`,
                }))}
              />
              <label className="space-y-1.5 text-sm font-medium">
                <span>Tipo</span>
                <select
                  className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                  value={movementType}
                  onChange={(event) =>
                    setMovementType(event.target.value as typeof movementType)
                  }
                >
                  <option value="ADJUSTMENT_IN">Ingreso</option>
                  <option value="ADJUSTMENT_OUT">Egreso</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                <span>Cantidad</span>
                <Input
                  required
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                <span>Motivo</span>
                <Input
                  required
                  minLength={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando' : 'Confirmar ajuste'}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
        <BarcodeCameraDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onDetected={(value) => void resolveBarcode(value)}
        />
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  warning,
}: {
  label: string;
  value: string | number;
  warning?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Boxes
          className={warning ? 'size-5 text-amber-600' : 'size-5 text-primary'}
          aria-hidden
        />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <select
        required
        className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'No se pudo completar la operación.';
}
