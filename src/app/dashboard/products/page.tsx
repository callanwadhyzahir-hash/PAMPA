'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Camera,
  Pencil,
  Printer,
  Plus,
  Search,
  Wand2,
  X,
} from 'lucide-react';

import {
  BarcodeCameraDialog,
  PrintBarcodeLabelsDialog,
} from '@/components/barcode';
import {
  ErrorState,
  LoadingState,
  ProductImage,
  ProductImageUpload,
} from '@/components/pampa-ui';
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
import { useAuthSession } from '@/hooks/use-auth-session';
import { useBarcodeEntry } from '@/hooks/use-barcode-entry';
import { ApiError } from '@/services/api';
import {
  productCategoriesService,
  type ProductCategory,
  type ProductCategoryAttributeKind,
} from '@/services/catalog/product-categories.service';
import {
  productsService,
  type Product,
  type ProductInput,
} from '@/services/catalog/products.service';

interface VariantDraftRow {
  id?: string;
  label: string;
  skuSuffix: string;
}

const ATTRIBUTE_KIND_DEFAULTS: Record<ProductCategoryAttributeKind, string[]> = {
  NONE: [],
  SIZE: ['S', 'M', 'L', 'XL'],
  VOLUME_ML: ['250ml', '500ml', '1000ml'],
  VOLUME_L: ['1L', '1.5L', '2L'],
  CUSTOM: [],
};

interface ProductForm {
  code: string;
  barcode: string;
  name: string;
  description: string;
  categoryId: string;
  productType: 'PRODUCT' | 'SERVICE';
  unit: string;
  cost: string;
  salePrice: string;
  taxRate: string;
  tracksStock: boolean;
  isActive: boolean;
}

const emptyForm: ProductForm = {
  code: '',
  barcode: '',
  name: '',
  description: '',
  categoryId: '',
  productType: 'PRODUCT',
  unit: 'UNIT',
  cost: '0',
  salePrice: '0',
  taxRate: '21',
  tracksStock: true,
  isActive: true,
};

export default function ProductsPage() {
  const { user } = useAuthSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [printing, setPrinting] = useState<Product | null>(null);
  const [stagedImageFile, setStagedImageFile] = useState<File | null>(null);
  const [variantDraft, setVariantDraft] = useState<VariantDraftRow[]>([]);
  const [originalVariants, setOriginalVariants] = useState<
    Product['product_variant']
  >([]);
  // Bumped on every dialog open so ProductImageUpload (keyed by it) remounts
  // with a clean slate — otherwise a cancelled "new product" would leak its
  // staged preview/error into the next one.
  const [dialogSession, setDialogSession] = useState(0);

  const canCreate = user?.permissions.includes('products.create') ?? false;
  const canUpdate = user?.permissions.includes('products.update') ?? false;
  const canDelete = user?.permissions.includes('products.delete') ?? false;

  async function load(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const [productPage, categoryRows] = await Promise.all([
        productsService.list({
          search: search.trim() || undefined,
          categoryId: categoryId || undefined,
          page: nextPage,
        }),
        productCategoriesService.list(),
      ]);
      setProducts(productPage.items);
      setPage(productPage.pagination.page);
      setPages(Math.max(productPage.pagination.pages, 1));
      setTotal(productPage.pagination.total);
      setCategories(categoryRows.filter((category) => category.is_active));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(1), 0);
    return () => window.clearTimeout(timer);
    // Filters are submitted explicitly to support barcode scanners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setStagedImageFile(null);
    setVariantDraft([]);
    setOriginalVariants([]);
    setError(null);
    setDialogSession((session) => session + 1);
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setForm({
      code: product.code,
      barcode: product.barcode ?? '',
      name: product.name,
      description: product.description ?? '',
      categoryId: product.category_id ?? '',
      productType:
        product.product_type === 'SERVICE' ? 'SERVICE' : 'PRODUCT',
      unit: product.unit,
      cost: product.cost,
      salePrice: product.sale_price,
      taxRate: product.tax_rate,
      tracksStock: product.tracks_stock,
      isActive: product.is_active,
    });
    setStagedImageFile(null);
    setVariantDraft(
      product.product_variant.map((variant) => ({
        id: variant.id,
        label: variant.label,
        skuSuffix: variant.sku_suffix ?? '',
      })),
    );
    setOriginalVariants(product.product_variant);
    setError(null);
    setDialogSession((session) => session + 1);
    setOpen(true);
  }

  function patchProductImage(id: string, imageUrl: string | null) {
    setProducts((current) =>
      current.map((product) =>
        product.id === id ? { ...product, image_url: imageUrl } : product,
      ),
    );
    setEditing((current) =>
      current && current.id === id
        ? { ...current, image_url: imageUrl }
        : current,
    );
    setDetail((current) =>
      current && current.id === id
        ? { ...current, image_url: imageUrl }
        : current,
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const input: ProductInput = {
      code: form.code,
      barcode: form.barcode || undefined,
      name: form.name,
      description: form.description || undefined,
      categoryId: form.categoryId || undefined,
      productType: form.productType,
      unit: form.unit,
      cost: Number(form.cost),
      salePrice: Number(form.salePrice),
      taxRate: Number(form.taxRate),
      tracksStock: form.productType === 'PRODUCT' && form.tracksStock,
      isActive: form.isActive,
    };
    try {
      const product = editing
        ? await productsService.update(editing.id, input)
        : await productsService.create(input);

      let imageError: string | null = null;
      if (!editing && stagedImageFile) {
        // Staged during create: the product didn't exist yet when the image
        // was picked, so the upload only happens now that it does.
        try {
          await productsService.uploadImage(product.id, stagedImageFile);
        } catch (reason) {
          imageError = `Producto guardado, pero no se pudo subir la imagen: ${errorMessage(reason)}`;
        }
      }

      let variantError: string | null = null;
      try {
        await saveVariants(product.id, originalVariants, variantDraft);
      } catch (reason) {
        variantError = `Producto guardado, pero no se pudieron guardar las variantes: ${errorMessage(reason)}`;
      }

      setOpen(false);
      setEditing(null);
      setStagedImageFile(null);
      setVariantDraft([]);
      setOriginalVariants([]);
      await load(1);
      if (imageError || variantError) {
        setError([imageError, variantError].filter(Boolean).join(' '));
      }
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: Product) {
    setError(null);
    try {
      if (product.is_active) {
        if (!window.confirm(`¿Desactivar ${product.name}?`)) return;
        await productsService.deactivate(product.id);
      } else {
        await productsService.update(product.id, { isActive: true });
      }
      await load(page);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  function money(product: Product, amount: string) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: product.company.currency.code,
    }).format(Number(amount));
  }

  if (loading && products.length === 0) {
    return <LoadingState label="Cargando productos" />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catálogo, precios y estado de inventario. {total} registros.
          </p>
        </div>
        {canCreate ? (
          <Button data-tour="product-new-button" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            Nuevo producto
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Catálogo</CardTitle>
          <CardDescription>
            La búsqueda acepta nombre, SKU o código de barras.
          </CardDescription>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void load(1);
            }}
          >
            <label className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="pl-9"
                placeholder="Nombre, SKU o escanear código"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              className="h-8 rounded-lg border bg-background px-3 text-sm"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <ErrorState
              title="No hay productos"
              description="Creá el primer producto o modificá los filtros."
            />
          ) : (
            <>
              <motion.div
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.03 } },
                }}
              >
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    whileHover={{ y: -3 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    <button
                      type="button"
                      className="flex flex-1 flex-col text-left"
                      onClick={() => setDetail(product)}
                    >
                      <div className="relative">
                        <ProductImage
                          src={product.image_url}
                          alt={product.name}
                          size="xl"
                          fill
                          className="rounded-none border-0 border-b"
                        />
                        {!product.is_active ? (
                          <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
                            Inactivo
                          </span>
                        ) : null}
                        {product.tracks_stock && product.low_stock ? (
                          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 shadow-sm">
                            <AlertTriangle className="size-3" aria-hidden />
                            Stock bajo
                          </span>
                        ) : null}
                        <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
                          {product.product_type === 'SERVICE'
                            ? 'Servicio'
                            : 'Producto'}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-1 p-3">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                          {product.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          SKU {product.code}
                          {product.barcode ? ` · ${product.barcode}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {product.product_category?.name ?? 'Sin categoría'}
                        </p>
                        <div className="mt-auto flex items-end justify-between pt-2">
                          <span className="text-base font-semibold">
                            {money(product, product.sale_price)}
                          </span>
                          {product.tracks_stock ? (
                            <span className="text-xs text-muted-foreground">
                              {product.total_stock} {product.unit}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center justify-end gap-1.5 border-t border-border p-2">
                      {canUpdate ? (
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label="Editar"
                          onClick={() => openEdit(product)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                      {product.barcode ? (
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label="Imprimir etiqueta"
                          onClick={() => setPrinting(product)}
                        >
                          <Printer className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                      {canDelete || canUpdate ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void toggleActive(product)}
                        >
                          {product.is_active ? 'Desactivar' : 'Activar'}
                        </Button>
                      ) : null}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => void load(page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {pages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pages}
                  onClick={() => void load(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ProductDialog
        open={open}
        editing={editing}
        form={form}
        categories={categories}
        saving={saving}
        setForm={setForm}
        variantDraft={variantDraft}
        setVariantDraft={setVariantDraft}
        dialogSession={dialogSession}
        onFileStaged={setStagedImageFile}
        onImageUploaded={(imageUrl) =>
          editing && patchProductImage(editing.id, imageUrl)
        }
        onImageRemoved={() => editing && patchProductImage(editing.id, null)}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        onSubmit={save}
      />

      <Dialog open={Boolean(detail)} onOpenChange={() => setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription>
              SKU {detail?.code} · {detail?.product_type}
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2 flex justify-center">
                <ProductImage
                  src={detail.image_url}
                  alt={detail.name}
                  size="xl"
                  expandable
                />
              </div>
              <Detail label="Precio" value={money(detail, detail.sale_price)} />
              <Detail label="Costo" value={money(detail, detail.cost)} />
              <Detail label="Impuesto" value={`${detail.tax_rate}%`} />
              <Detail label="Unidad" value={detail.unit} />
              <Detail label="Stock total" value={detail.total_stock} />
              <Detail label="Stock mínimo" value={detail.minimum_stock} />
              <div className="col-span-2">
                <dt className="text-muted-foreground">Descripción</dt>
                <dd>{detail.description ?? 'Sin descripción'}</dd>
              </div>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

      {printing ? (
        <PrintBarcodeLabelsDialog
          open={Boolean(printing)}
          onOpenChange={(next) => !next && setPrinting(null)}
          barcode={printing.barcode ?? ''}
          productName={printing.name}
          sku={printing.code}
          price={money(printing, printing.sale_price)}
        />
      ) : null}
    </main>
  );
}

function ProductDialog({
  open,
  editing,
  form,
  categories,
  saving,
  setForm,
  variantDraft,
  setVariantDraft,
  dialogSession,
  onFileStaged,
  onImageUploaded,
  onImageRemoved,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: Product | null;
  form: ProductForm;
  categories: ProductCategory[];
  saving: boolean;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  variantDraft: VariantDraftRow[];
  setVariantDraft: React.Dispatch<React.SetStateAction<VariantDraftRow[]>>;
  dialogSession: number;
  onFileStaged: (file: File | null) => void;
  onImageUploaded: (imageUrl: string) => void;
  onImageRemoved: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => Promise<void>;
}) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  function field<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const selectedCategory = categories.find(
    (category) => category.id === form.categoryId,
  );
  const showVariants =
    (selectedCategory && selectedCategory.attribute_kind !== 'NONE') ||
    variantDraft.length > 0;

  function changeCategory(categoryId: string) {
    field('categoryId', categoryId);
    const category = categories.find((item) => item.id === categoryId);
    if (!category || category.attribute_kind === 'NONE') return;
    setVariantDraft((current) => {
      if (current.length > 0) return current;
      const options = category.product_category_attribute_option.length
        ? category.product_category_attribute_option.map((option) => option.label)
        : ATTRIBUTE_KIND_DEFAULTS[category.attribute_kind];
      return options.map((label) => ({ label, skuSuffix: '' }));
    });
  }

  const barcodeEntry = useBarcodeEntry({
    value: form.barcode,
    onScan: (barcode) => field('barcode', barcode),
    inputRef: barcodeInputRef,
  });

  async function generateBarcode() {
    setGenerating(true);
    setBarcodeError(null);
    try {
      const { barcode } = await productsService.generateBarcode();
      field('barcode', barcode);
    } catch (reason) {
      setBarcodeError(errorMessage(reason));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar producto' : 'Nuevo producto'}
            </DialogTitle>
            <DialogDescription>
              Precios expresados en la moneda base de la empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[65vh] gap-4 overflow-y-auto py-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">
                Imagen del producto
              </span>
              <ProductImageUpload
                key={dialogSession}
                productId={editing?.id}
                value={editing?.image_url}
                productName={form.name || 'Producto'}
                onFileStaged={onFileStaged}
                onUploaded={onImageUploaded}
                onRemoved={onImageRemoved}
              />
            </div>
            <Field label="Nombre">
              <Input
                required
                value={form.name}
                onChange={(event) => field('name', event.target.value)}
              />
            </Field>
            <Field label="SKU">
              <Input
                required
                value={form.code}
                onChange={(event) => field('code', event.target.value)}
              />
            </Field>
            <Field label="Código de barras">
              <div className="flex gap-2">
                <Input
                  ref={barcodeInputRef}
                  value={form.barcode}
                  onChange={(event) => field('barcode', event.target.value)}
                  onKeyDown={barcodeEntry.onKeyDown}
                  placeholder="Escanear o generar"
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
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Generar código interno"
                  disabled={generating}
                  onClick={() => void generateBarcode()}
                >
                  <Wand2 className="size-4" aria-hidden />
                </Button>
              </div>
              {barcodeError ? (
                <p className="text-xs text-destructive">{barcodeError}</p>
              ) : null}
              <BarcodeCameraDialog
                open={cameraOpen}
                onOpenChange={setCameraOpen}
                onDetected={(value) => field('barcode', value)}
              />
            </Field>
            <Field label="Categoría">
              <select
                className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                value={form.categoryId}
                onChange={(event) => changeCategory(event.target.value)}
              >
                <option value="">Sin categoría</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo">
              <select
                className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                value={form.productType}
                onChange={(event) =>
                  field(
                    'productType',
                    event.target.value as ProductForm['productType'],
                  )
                }
              >
                <option value="PRODUCT">Producto</option>
                <option value="SERVICE">Servicio</option>
              </select>
            </Field>
            <Field label="Unidad">
              <Input
                required
                value={form.unit}
                onChange={(event) => field('unit', event.target.value)}
              />
            </Field>
            <Field label="Costo">
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.cost}
                onChange={(event) => field('cost', event.target.value)}
              />
            </Field>
            <Field label="Precio de venta">
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.salePrice}
                onChange={(event) => field('salePrice', event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Debe ser mayor que cero para evitar ventas sin importe.
              </p>
            </Field>
            <Field label="Impuesto %">
              <Input
                required
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.taxRate}
                onChange={(event) => field('taxRate', event.target.value)}
              />
            </Field>
            <Field label="Descripción">
              <Input
                value={form.description}
                onChange={(event) => field('description', event.target.value)}
              />
            </Field>
            {showVariants ? (
              <div
                className="space-y-1.5 text-sm font-medium sm:col-span-2"
                data-tour="product-variant-editor"
              >
                <span>Variantes</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {selectedCategory && selectedCategory.attribute_kind !== 'NONE'
                    ? `Talles, ml o litros según la categoría "${selectedCategory.name}". El comprador va a ver cuál está disponible.`
                    : 'El comprador va a ver cuál variante está disponible.'}
                </span>
                <div className="space-y-2">
                  {variantDraft.map((row, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Etiqueta (ej. M, 500ml)"
                        maxLength={50}
                        value={row.label}
                        onChange={(event) =>
                          setVariantDraft((current) =>
                            current.map((value, valueIndex) =>
                              valueIndex === index
                                ? { ...value, label: event.target.value }
                                : value,
                            ),
                          )
                        }
                      />
                      <Input
                        placeholder="Sufijo SKU (opcional)"
                        maxLength={30}
                        value={row.skuSuffix}
                        onChange={(event) =>
                          setVariantDraft((current) =>
                            current.map((value, valueIndex) =>
                              valueIndex === index
                                ? { ...value, skuSuffix: event.target.value }
                                : value,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Quitar variante"
                        onClick={() =>
                          setVariantDraft((current) =>
                            current.filter((_, valueIndex) => valueIndex !== index),
                          )
                        }
                      >
                        <X className="size-3.5" aria-hidden />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setVariantDraft((current) => [
                      ...current,
                      { label: '', skuSuffix: '' },
                    ])
                  }
                >
                  <Plus className="size-3.5" aria-hidden />
                  Agregar variante
                </Button>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.tracksStock}
                disabled={form.productType === 'SERVICE'}
                onChange={(event) =>
                  field('tracksStock', event.target.checked)
                }
              />
              Controla stock
            </label>
            {editing ? (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    field('isActive', event.target.checked)
                  }
                />
                Producto activo
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

async function saveVariants(
  productId: string,
  original: Product['product_variant'],
  draft: VariantDraftRow[],
) {
  const originalById = new Map(original.map((variant) => [variant.id, variant]));
  const draftIds = new Set(
    draft.map((row) => row.id).filter((id): id is string => Boolean(id)),
  );

  const removed = original.filter((variant) => !draftIds.has(variant.id));
  const toCreate = draft.filter(
    (row) => !row.id && row.label.trim().length > 0,
  );
  const toUpdate = draft.filter((row) => {
    if (!row.id) return false;
    const previous = originalById.get(row.id);
    if (!previous) return false;
    return (
      row.label.trim() !== previous.label ||
      (row.skuSuffix.trim() || null) !== previous.sku_suffix
    );
  });

  await Promise.all([
    ...toCreate.map((row) =>
      productsService.createVariant(productId, {
        label: row.label.trim(),
        skuSuffix: row.skuSuffix.trim() || undefined,
      }),
    ),
    ...toUpdate.map((row) =>
      productsService.updateVariant(productId, row.id!, {
        label: row.label.trim(),
        skuSuffix: row.skuSuffix.trim() || undefined,
      }),
    ),
    ...removed.map((variant) =>
      productsService.removeVariant(productId, variant.id),
    ),
  ]);
}

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'No se pudo completar la operación.';
}
