'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  ImageUp,
  Loader2,
  Sparkles,
} from 'lucide-react';

import { ErrorState } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError } from '@/services/api';
import { productCategoriesService, type ProductCategory } from '@/services/catalog/product-categories.service';
import { warehousesService, type Warehouse } from '@/services/inventory/warehouses.service';
import {
  smartImportService,
  type ConfirmImportItem,
  type SmartImportConfirmResult,
  type SmartImportWarning,
} from '@/services/inventory/smart-import.service';

const WARNING_LABEL: Record<SmartImportWarning, string> = {
  DUPLICATE_BARCODE: 'Código de barras ya existe',
  POSSIBLE_DUPLICATE_NAME: 'Posible duplicado',
  MISSING_PRICE: 'Falta precio',
  MISSING_STOCK: 'Falta stock',
  CATEGORY_NOT_FOUND: 'Categoría no encontrada',
};

interface EditableItem {
  name: string;
  code: string;
  barcode: string;
  categoryId: string;
  variantLabel: string;
  description: string;
  price: string;
  stock: string;
  warnings: SmartImportWarning[];
}

function errorMessage(reason: unknown): string {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'Ocurrió un error inesperado.';
}

export default function SmartImportPage() {
  const router = useRouter();
  const { user } = useAuthSession();
  const canImport =
    (user?.permissions.includes('products.create') ?? false) &&
    (user?.permissions.includes('stock.adjust') ?? false) &&
    (user?.permissions.includes('ai.use') ?? false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [warehouseId, setWarehouseId] = useState('');

  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageText, setImageText] = useState('');

  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [items, setItems] = useState<EditableItem[] | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [result, setResult] = useState<SmartImportConfirmResult | null>(null);

  useEffect(() => {
    if (!canImport) return;
    void warehousesService.list().then((list) => {
      setWarehouses(list);
      if (list.length > 0) setWarehouseId((current) => current || list[0].id);
    });
    void productCategoriesService.list().then(setCategories);
  }, [canImport]);

  if (!canImport) {
    return (
      <ErrorState
        title="Sin permiso"
        description="No tenés permiso para usar la carga inteligente de stock."
      />
    );
  }

  async function handleExtractText() {
    if (!text.trim() || extracting) return;
    setExtracting(true);
    setExtractError(null);
    setResult(null);
    try {
      const preview = await smartImportService.extractFromText(text);
      applyPreview(preview.items, preview.provider);
    } catch (reason) {
      setExtractError(errorMessage(reason));
    } finally {
      setExtracting(false);
    }
  }

  async function handleExtractImage() {
    if (!imageFile || extracting) return;
    setExtracting(true);
    setExtractError(null);
    setResult(null);
    try {
      const preview = await smartImportService.extractFromImage(imageFile, imageText || undefined);
      applyPreview(preview.items, preview.provider);
    } catch (reason) {
      setExtractError(errorMessage(reason));
    } finally {
      setExtracting(false);
    }
  }

  function applyPreview(
    previewItems: Array<{
      name: string;
      code: string;
      barcode: string | null;
      categoryId: string | null;
      variantLabel: string | null;
      description: string | null;
      price: number | null;
      stock: number | null;
      warnings: SmartImportWarning[];
    }>,
    providerUsed: string,
  ) {
    setProvider(providerUsed);
    setItems(
      previewItems.map((item) => ({
        name: item.name,
        code: item.code,
        barcode: item.barcode ?? '',
        categoryId: item.categoryId ?? '',
        variantLabel: item.variantLabel ?? '',
        description: item.description ?? '',
        price: item.price !== null ? String(item.price) : '',
        stock: item.stock !== null ? String(item.stock) : '',
        warnings: item.warnings,
      })),
    );
  }

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setItems((current) =>
      current
        ? current.map((item, i) => (i === index ? { ...item, ...patch } : item))
        : current,
    );
  }

  function removeItem(index: number) {
    setItems((current) => (current ? current.filter((_, i) => i !== index) : current));
  }

  const readyItems = items?.filter((item) => Number(item.price) > 0) ?? [];
  const blockedItems = (items?.length ?? 0) - readyItems.length;

  async function handleConfirm() {
    if (!items || items.length === 0 || confirming || !warehouseId) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const payload: ConfirmImportItem[] = readyItems.map((item) => ({
        name: item.name,
        code: item.code || undefined,
        barcode: item.barcode || undefined,
        categoryId: item.categoryId || undefined,
        variantLabel: item.variantLabel || undefined,
        description: item.description || undefined,
        salePrice: Number(item.price),
        stock: item.stock ? Number(item.stock) : undefined,
      }));
      const confirmResult = await smartImportService.confirm(warehouseId, payload);
      setResult(confirmResult);
      setItems(null);
      setText('');
      setImageFile(null);
      setImageText('');
    } catch (reason) {
      setConfirmError(errorMessage(reason));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="size-6 text-primary" aria-hidden="true" />
          Carga inteligente de stock
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escribí tu lista de productos o subí una foto/documento — la IA arma los productos, vos revisás y confirmás antes de que se carguen al inventario.
        </p>
      </div>

      {result ? (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
            {result.created} producto{result.created === 1 ? '' : 's'} cargado
            {result.created === 1 ? '' : 's'}
            {result.failed > 0 ? `, ${result.failed} con error` : ''}.
          </div>
          <ul className="space-y-1 text-sm">
            {result.items.map((item, index) => (
              <li key={index} className="flex items-center justify-between gap-2">
                <span>{item.name}</span>
                {item.status === 'CREATED' ? (
                  <Badge variant="success">Cargado</Badge>
                ) : (
                  <span className="text-xs text-destructive">{item.error}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="lime" onClick={() => router.push('/dashboard/products')}>
              Ver productos
            </Button>
            <Button type="button" variant="outline" onClick={() => setResult(null)}>
              Cargar más productos
            </Button>
          </div>
        </div>
      ) : (
        <>
          {warehouses.length > 0 ? (
            <label className="block max-w-xs space-y-1.5 text-sm font-medium">
              <span>Depósito de destino</span>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-sm text-muted-foreground">
              Necesitás al menos un depósito activo para cargar stock.
            </p>
          )}

          {!items ? (
            <Tabs defaultValue="texto">
              <TabsList>
                <TabsIndicator />
                <TabsTab value="texto">✍️ Texto</TabsTab>
                <TabsTab value="imagen">📷 Imagen / archivo</TabsTab>
              </TabsList>

              <TabsPanel value="texto" className="mt-4 space-y-3">
                <Textarea
                  rows={6}
                  placeholder={'Remera Nike negra talle M x10 $25000\nPantalón Adidas negro talle 42 x8 $45000'}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  disabled={extracting}
                />
                {extractError ? <p className="text-sm text-destructive">{extractError}</p> : null}
                <Button type="button" variant="lime" disabled={!text.trim() || extracting} onClick={() => void handleExtractText()}>
                  {extracting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {extracting ? 'Analizando…' : 'Analizar con IA'}
                </Button>
              </TabsPanel>

              <TabsPanel value="imagen" className="mt-4 space-y-3">
                <label className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  {imageFile ? (
                    <FileUp className="size-6" aria-hidden="true" />
                  ) : (
                    <ImageUp className="size-6" aria-hidden="true" />
                  )}
                  <span>{imageFile ? imageFile.name : 'Subí una foto, lista, factura o PDF'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <Input
                  placeholder="Contexto adicional (opcional)"
                  value={imageText}
                  onChange={(event) => setImageText(event.target.value)}
                  disabled={extracting}
                />
                {extractError ? <p className="text-sm text-destructive">{extractError}</p> : null}
                <Button type="button" variant="lime" disabled={!imageFile || extracting} onClick={() => void handleExtractImage()}>
                  {extracting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {extracting ? 'Analizando…' : 'Analizar con IA'}
                </Button>
              </TabsPanel>
            </Tabs>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {items.length} producto{items.length === 1 ? '' : 's'} detectado{items.length === 1 ? '' : 's'}
                  {provider ? ` con ${provider === 'gemini' ? 'Gemini' : 'OpenAI'}` : ''}. Revisá y corregí antes de confirmar.
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setItems(null)}>
                  Descartar
                </Button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Variante</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Avisos</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="min-w-40">
                          <Input
                            value={item.name}
                            onChange={(event) => updateItem(index, { name: event.target.value })}
                          />
                        </TableCell>
                        <TableCell className="min-w-24">
                          <Input
                            value={item.variantLabel}
                            placeholder="—"
                            onChange={(event) => updateItem(index, { variantLabel: event.target.value })}
                          />
                        </TableCell>
                        <TableCell className="min-w-36">
                          <select
                            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                            value={item.categoryId}
                            onChange={(event) => updateItem(index, { categoryId: event.target.value })}
                          >
                            <option value="">Sin categoría</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="min-w-24">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(event) => updateItem(index, { price: event.target.value })}
                          />
                        </TableCell>
                        <TableCell className="min-w-20">
                          <Input
                            type="number"
                            min="0"
                            step="0.001"
                            value={item.stock}
                            onChange={(event) => updateItem(index, { stock: event.target.value })}
                          />
                        </TableCell>
                        <TableCell className="min-w-40">
                          <div className="flex flex-wrap gap-1">
                            {item.warnings.map((warning) => (
                              <Badge key={warning} variant="warning" className="whitespace-nowrap text-[10px]">
                                <AlertTriangle className="size-3" aria-hidden="true" />
                                {WARNING_LABEL[warning]}
                              </Badge>
                            ))}
                            {item.warnings.length === 0 ? (
                              <Badge variant="success" className="text-[10px]">
                                <CheckCircle2 className="size-3" aria-hidden="true" />
                                Listo
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                            Quitar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {blockedItems > 0 ? (
                <p className="text-sm text-warning">
                  {blockedItems} producto{blockedItems === 1 ? '' : 's'} sin precio válido — no se van a importar hasta que completes el precio.
                </p>
              ) : null}
              {confirmError ? <p className="text-sm text-destructive">{confirmError}</p> : null}

              <Button
                type="button"
                variant="lime"
                disabled={confirming || readyItems.length === 0 || !warehouseId}
                onClick={() => void handleConfirm()}
              >
                {confirming ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                {confirming
                  ? 'Importando…'
                  : `Confirmar importación (${readyItems.length})`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
