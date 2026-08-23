'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Share2,
  Store,
} from 'lucide-react';

import { ErrorState, LoadingState, ProductPickerRow, SearchInput } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuthSession } from '@/hooks/use-auth-session';
import { branchesService } from '@/services/administration/branches.service';
import type { BranchDetail } from '@/services/administration/types';
import { ApiError } from '@/services/api';
import { catalogService, type CatalogStatus } from '@/services/catalog/catalog.service';
import { productsService, type Product } from '@/services/catalog/products.service';
import { warehousesService, type Warehouse } from '@/services/inventory/warehouses.service';

interface CatalogForm {
  branchId: string;
  warehouseId: string;
  slug: string;
  displayName: string;
  description: string;
  whatsapp: string;
  contactEmail: string;
  isEnabled: boolean;
  showPrices: boolean;
  showAvailability: boolean;
}

const emptyForm: CatalogForm = {
  branchId: '',
  warehouseId: '',
  slug: '',
  displayName: '',
  description: '',
  whatsapp: '',
  contactEmail: '',
  isEnabled: false,
  showPrices: true,
  showAvailability: true,
};

function slugify(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'Ocurrió un error inesperado.';
}

export default function CatalogSettingsPage() {
  const { user } = useAuthSession();
  const canManage = user?.permissions.includes('catalog.manage') ?? false;
  const canRead = canManage || (user?.permissions.includes('catalog.read') ?? false);

  const [status, setStatus] = useState<CatalogStatus | null>(null);
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [copied, setCopied] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productsLoading, setProductsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined' || !form.slug) return '';
    return `${window.location.origin}/c/${form.slug}`;
  }, [form.slug]);

  const branchWarehouses = useMemo(
    () => warehouses.filter((warehouse) => warehouse.branch_id === form.branchId),
    [warehouses, form.branchId],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const statusResult = await catalogService.getOwn();
      // Only a manager can change the branch/warehouse selects, so only fetch the lists
      // for them — a catalog.read-only role (e.g. Vendedor) commonly lacks branches.read
      // and warehouses.read, and those 403s shouldn't take down the whole read-only view.
      const [branchResult, warehouseResult] = canManage
        ? await Promise.all([branchesService.list(), warehousesService.list()])
        : [[], []];
      setStatus(statusResult);
      setBranches(branchResult);
      setWarehouses(warehouseResult);
      if (statusResult.catalog) {
        const catalog = statusResult.catalog;
        setForm({
          branchId: catalog.branch_id,
          warehouseId: catalog.warehouse_id,
          slug: catalog.slug,
          displayName: catalog.display_name,
          description: catalog.description ?? '',
          whatsapp: catalog.whatsapp ?? '',
          contactEmail: catalog.contact_email ?? '',
          isEnabled: catalog.is_enabled,
          showPrices: catalog.show_prices,
          showAvailability: catalog.show_availability,
        });
        setSlugTouched(true);
      } else {
        const mainBranch = branchResult.find((branch) => branch.is_main) ?? branchResult[0];
        setForm((current) => ({ ...current, branchId: mainBranch?.id ?? '' }));
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts(search: string) {
    setProductsLoading(true);
    try {
      const page = await productsService.list({
        search: search.trim() || undefined,
        isActive: true,
        limit: 30,
      });
      setProducts(page.items);
    } catch {
      // Keep the previous list visible; the toolbar search can be retried.
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canRead) return;
    const timer = window.setTimeout(() => void loadProducts(productSearch), 300);
    return () => window.clearTimeout(timer);
     
  }, [productSearch, canRead]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const firstOfBranch = warehouses.find((warehouse) => warehouse.branch_id === form.branchId);
      if (form.branchId && !branchWarehouses.some((w) => w.id === form.warehouseId)) {
        setForm((current) => ({ ...current, warehouseId: firstOfBranch?.id ?? '' }));
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branchId, warehouses]);

  function handleDisplayNameChange(value: string) {
    setForm((current) => ({
      ...current,
      displayName: value,
      slug: slugTouched ? current.slug : slugify(value),
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const catalog = await catalogService.upsert({
        branchId: form.branchId,
        warehouseId: form.warehouseId,
        slug: form.slug,
        displayName: form.displayName,
        description: form.description || undefined,
        whatsapp: form.whatsapp || undefined,
        contactEmail: form.contactEmail || undefined,
        isEnabled: form.isEnabled,
        showPrices: form.showPrices,
        showAvailability: form.showAvailability,
      });
      setStatus((current) => (current ? { ...current, catalog, configured: true } : current));
    } catch (reason) {
      setSaveError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function toggleProductVisibility(product: Product) {
    setTogglingId(product.id);
    try {
      await catalogService.setProductsVisibility([product.id], !product.catalog_visible);
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? { ...item, catalog_visible: !item.catalog_visible }
            : item,
        ),
      );
      setStatus((current) =>
        current
          ? {
              ...current,
              publishedProducts:
                current.publishedProducts + (product.catalog_visible ? -1 : 1),
            }
          : current,
      );
    } catch {
      // Row stays as-is; user can retry the click.
    } finally {
      setTogglingId(null);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied — user can select the text manually.
    }
  }

  async function shareLink() {
    if (!publicUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: form.displayName, url: publicUrl });
      } catch {
        // User cancelled the share sheet.
      }
    } else {
      void copyLink();
    }
  }

  if (loading) return <LoadingState label="Cargando catálogo" />;
  if (error) return <ErrorState description={error} action={<Button onClick={() => void load()}>Reintentar</Button>} />;
  if (!canRead) {
    return <ErrorState title="Sin permiso" description="No tenés permiso para ver el catálogo público." />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Store className="size-6 text-primary" aria-hidden="true" />
          Catálogo público
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mostrá tus productos con un enlace compartible y recibí pedidos directamente en PAMPA.
        </p>
      </div>

      {status?.configured ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={form.isEnabled ? 'success' : 'neutral'}>
                {form.isEnabled ? 'Activo' : 'Desactivado'}
              </Badge>
              <div>
                <p className="text-sm font-medium">{publicUrl || 'Guardá el catálogo para generar el enlace.'}</p>
                <p className="text-xs text-muted-foreground">
                  {status.publishedProducts} producto{status.publishedProducts === 1 ? '' : 's'} publicado
                  {status.publishedProducts === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyLink()} disabled={!publicUrl}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copiado' : 'Copiar enlace'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void shareLink()} disabled={!publicUrl}>
                <Share2 className="size-4" />
                Compartir
              </Button>
              {publicUrl ? (
                <Button
                  type="button"
                  variant="lime"
                  size="sm"
                  render={<a href={publicUrl} target="_blank" rel="noreferrer" />}
                >
                  Ver catálogo
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>
              Elegí qué sucursal y depósito reflejan tu disponibilidad pública.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              <span>Nombre del negocio</span>
              <Input
                required
                value={form.displayName}
                onChange={(event) => handleDisplayNameChange(event.target.value)}
                placeholder="Ferretería Central"
                disabled={!canManage}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2" data-tour="catalog-slug-field">
              <span>Enlace público</span>
              <div className="flex items-center gap-1">
                <span className="shrink-0 text-sm text-muted-foreground">/c/</span>
                <Input
                  required
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setForm((current) => ({ ...current, slug: slugify(event.target.value) }));
                  }}
                  placeholder="ferreteria-central"
                  disabled={!canManage}
                />
              </div>
            </label>
            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
              <span>Descripción (opcional)</span>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Contale a tus clientes qué vendés y cómo contactarte."
                disabled={!canManage}
                rows={3}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>Sucursal</span>
              <select
                required
                className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm"
                value={form.branchId}
                onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}
                disabled={!canManage}
              >
                <option value="">Seleccionar</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium" data-tour="catalog-warehouse-field">
              <span>Depósito</span>
              <select
                required
                className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-sm"
                value={form.warehouseId}
                onChange={(event) => setForm((current) => ({ ...current, warehouseId: event.target.value }))}
                disabled={!canManage || !form.branchId}
              >
                <option value="">Seleccionar</option>
                {branchWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <span className="block text-xs font-normal text-muted-foreground">
                La disponibilidad pública se calcula sobre el stock de este depósito.
              </span>
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>WhatsApp (opcional)</span>
              <Input
                value={form.whatsapp}
                onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
                placeholder="+54 9 11 1234-5678"
                disabled={!canManage}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              <span>Email de contacto (opcional)</span>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
                placeholder="ventas@minegocio.com"
                disabled={!canManage}
              />
            </label>
          </CardContent>
        </Card>

        <Card data-tour="catalog-visibility">
          <CardHeader>
            <CardTitle>Visibilidad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ToggleRow
              label="Catálogo activo"
              description="Con esto apagado, el enlace muestra que el catálogo no está disponible."
              checked={form.isEnabled}
              onChange={(value) => setForm((current) => ({ ...current, isEnabled: value }))}
              disabled={!canManage}
            />
            <ToggleRow
              label="Mostrar precios"
              description="Si lo desactivás, los clientes ven el catálogo sin precios."
              checked={form.showPrices}
              onChange={(value) => setForm((current) => ({ ...current, showPrices: value }))}
              disabled={!canManage}
            />
            <ToggleRow
              label="Mostrar disponibilidad"
              description="Muestra Disponible / Últimas unidades / Sin stock — nunca la cantidad exacta."
              checked={form.showAvailability}
              onChange={(value) => setForm((current) => ({ ...current, showAvailability: value }))}
              disabled={!canManage}
            />
          </CardContent>
        </Card>

        {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

        {canManage ? (
          <Button type="submit" variant="lime" disabled={saving} data-tour="catalog-save-button">
            {saving ? 'Guardando…' : 'Guardar catálogo'}
          </Button>
        ) : null}
      </form>

      <Card data-tour="catalog-products-list">
        <CardHeader>
          <CardTitle>Productos publicados</CardTitle>
          <CardDescription>Elegí qué productos se muestran en el catálogo público.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SearchInput
            placeholder="Buscar producto…"
            value={productSearch}
            onChange={(event) => setProductSearch(event.target.value)}
          />
          {productsLoading ? (
            <LoadingState label="Buscando productos" />
          ) : products.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron productos activos.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {products.map((product) => (
                <li key={product.id} className="flex items-center gap-3 py-2.5">
                  <ProductPickerRow
                    className="flex-1"
                    imageUrl={product.image_url}
                    name={product.name}
                    code={product.code}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={product.catalog_visible ? 'lime' : 'outline'}
                    disabled={!canManage || togglingId === product.id}
                    onClick={() => void toggleProductVisibility(product)}
                  >
                    {product.catalog_visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    {product.catalog_visible ? 'Visible' : 'Oculto'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
