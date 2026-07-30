'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil, Plus, Search, Tags } from 'lucide-react';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
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
import { ApiError } from '@/services/api';
import {
  productCategoriesService,
  type ProductCategory,
} from '@/services/catalog/product-categories.service';

interface CategoryForm {
  name: string;
  description: string;
  isActive: boolean;
}

const emptyForm: CategoryForm = {
  name: '',
  description: '',
  isActive: true,
};

export default function ProductCategoriesPage() {
  const { user } = useAuthSession();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const canCreate =
    user?.permissions.includes('product_categories.create') ?? false;
  const canUpdate =
    user?.permissions.includes('product_categories.update') ?? false;
  const canDelete =
    user?.permissions.includes('product_categories.delete') ?? false;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCategories(await productCategoriesService.list());
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleCategories = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    if (!term) return categories;
    return categories.filter((category) =>
      `${category.name} ${category.description ?? ''}`
        .toLocaleLowerCase('es')
        .includes(term),
    );
  }, [categories, search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function openEdit(category: ProductCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? '',
      isActive: category.is_active,
    });
    setError(null);
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const input = {
        name: form.name,
        description: form.description || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await productCategoriesService.update(editing.id, input);
      } else {
        await productCategoriesService.create(input);
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: ProductCategory) {
    setError(null);
    try {
      if (category.is_active) {
        if (
          !window.confirm(
            `¿Desactivar ${category.name}? Sus productos conservarán el historial.`,
          )
        ) {
          return;
        }
        await productCategoriesService.remove(category.id);
      } else {
        await productCategoriesService.update(category.id, { isActive: true });
      }
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  if (loading && categories.length === 0) {
    return <LoadingState label="Cargando categorías" />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organización del catálogo de productos de la empresa.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            Nueva categoría
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
          <CardTitle>Categorías de producto</CardTitle>
          <CardDescription>
            Una categoría con productos se desactiva para conservar el
            historial.
          </CardDescription>
          <label className="relative mt-3 block max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre o descripción"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </CardHeader>
        <CardContent>
          {visibleCategories.length === 0 ? (
            <ErrorState
              title={search ? 'Sin resultados' : 'Todavía no hay categorías'}
              description={
                search
                  ? 'Probá con otro término de búsqueda.'
                  : 'Creá la primera categoría para organizar productos.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <Tags
                          className="mt-0.5 size-4 text-muted-foreground"
                          aria-hidden
                        />
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="max-w-xl text-xs text-muted-foreground">
                            {category.description ?? 'Sin descripción'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{category._count.product}</TableCell>
                    <TableCell>
                      <Badge
                        variant={category.is_active ? 'success' : 'danger'}
                      >
                        {category.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {canUpdate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(category)}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            Editar
                          </Button>
                        ) : null}
                        {canDelete || canUpdate ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void toggleActive(category)}
                          >
                            {category.is_active ? 'Desactivar' : 'Activar'}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setError(null);
        }}
      >
        <DialogContent>
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Editar categoría' : 'Nueva categoría'}
              </DialogTitle>
              <DialogDescription>
                El nombre debe ser único dentro de tu empresa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <label className="space-y-1.5 text-sm font-medium">
                <span>Nombre</span>
                <Input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                <span>Descripción</span>
                <Input
                  maxLength={1000}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              {editing ? (
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  Categoría activa
                </label>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'No se pudo completar la operación.';
}
