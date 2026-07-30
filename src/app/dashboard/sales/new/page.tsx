'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

import { LoadingState } from '@/components/pampa-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/services/api';
import { branchesService } from '@/services/administration/branches.service';
import type { BranchDetail } from '@/services/administration/types';
import {
  clientsService,
  type Client,
} from '@/services/commercial/clients.service';
import { salesService } from '@/services/commercial/sales.service';
import {
  productsService,
  type Product,
} from '@/services/catalog/products.service';
import {
  warehousesService,
  type Warehouse,
} from '@/services/inventory/warehouses.service';

interface DraftItem {
  productId: string;
  quantity: string;
  discountPercent: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branchId, setBranchId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [clientId, setClientId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      branchesService.list(),
      warehousesService.list(),
      clientsService.list(),
      productsService.list({ isActive: true, limit: 100 }),
    ])
      .then(([branchRows, warehouseRows, clientRows, productPage]) => {
        if (!active) return;
        setBranches(branchRows.filter((row) => row.is_active));
        setWarehouses(warehouseRows.filter((row) => row.is_active));
        setClients(clientRows.filter((row) => row.is_active));
        setProducts(productPage.items.filter((row) => row.is_active));
      })
      .catch((reason: unknown) => setError(message(reason)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const availableWarehouses = warehouses.filter(
    (warehouse) => warehouse.branch_id === branchId,
  );
  const matchingProducts = useMemo(() => {
    const term = productSearch.trim().toLocaleLowerCase('es');
    if (!term) return products.slice(0, 20);
    return products
      .filter((product) =>
        `${product.name} ${product.code} ${product.barcode ?? ''}`
          .toLocaleLowerCase('es')
          .includes(term),
      )
      .slice(0, 20);
  }, [productSearch, products]);

  function addProduct(product: Product) {
    if (items.some((item) => item.productId === product.id)) return;
    setItems((current) => [
      ...current,
      { productId: product.id, quantity: '1', discountPercent: '0' },
    ]);
    setProductSearch('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (items.length === 0) {
      setError('Agregá al menos un producto.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const sale = await salesService.create({
        branchId,
        warehouseId,
        clientId: clientId || undefined,
        notes: notes || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          discountPercent: Number(item.discountPercent),
        })),
      });
      router.push(`/dashboard/sales/${sale.id}`);
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Preparando venta" />;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-5 sm:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva venta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El backend recalculará precios, descuentos, impuestos y totales.
        </p>
      </div>
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <form className="space-y-6" onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Contexto operativo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Sucursal"
              value={branchId}
              onChange={(value) => {
                setBranchId(value);
                setWarehouseId('');
              }}
              options={branches.map((row) => ({
                value: row.id,
                label: row.name,
              }))}
            />
            <Select
              label="Depósito"
              value={warehouseId}
              onChange={setWarehouseId}
              options={availableWarehouses.map((row) => ({
                value: row.id,
                label: row.name,
              }))}
            />
            <Select
              label="Cliente"
              value={clientId}
              onChange={setClientId}
              required={false}
              placeholder="Consumidor final"
              options={clients.map((row) => ({
                value: row.id,
                label:
                  row.business_name ??
                  [row.first_name, row.last_name].filter(Boolean).join(' '),
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Buscar por nombre, SKU o escanear código"
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
            />
            {productSearch ? (
              <div className="max-h-52 overflow-y-auto rounded-lg border">
                {matchingProducts.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    className="flex w-full items-center justify-between border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted"
                    onClick={() => addProduct(product)}
                  >
                    <span>
                      {product.name}{' '}
                      <span className="text-muted-foreground">
                        · {product.code}
                      </span>
                    </span>
                    <span>{currency(product.sale_price)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="space-y-2">
              {items.map((item) => {
                const product = products.find(
                  (row) => row.id === item.productId,
                )!;
                return (
                  <div
                    key={item.productId}
                    className="grid items-end gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_120px_120px_auto]"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.code} · {currency(product.sale_price)}
                      </p>
                    </div>
                    <Field label="Cantidad">
                      <Input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((row) =>
                              row.productId === item.productId
                                ? { ...row, quantity: event.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label="Descuento %">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discountPercent}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((row) =>
                              row.productId === item.productId
                                ? {
                                    ...row,
                                    discountPercent: event.target.value,
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar ${product.name}`}
                      onClick={() =>
                        setItems((current) =>
                          current.filter(
                            (row) => row.productId !== item.productId,
                          ),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            <Field label="Observaciones">
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving || !branchId || !warehouseId}
          >
            <Plus className="size-4" />
            {saving ? 'Guardando' : 'Guardar borrador'}
          </Button>
        </div>
      </form>
    </main>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required = true,
  placeholder = 'Seleccionar',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      <select
        required={required}
        className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
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
      : 'No se pudo completar la venta.';
}
