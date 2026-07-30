'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Warehouse as WarehouseIcon } from 'lucide-react';

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
import { branchesService } from '@/services/administration/branches.service';
import type { BranchDetail } from '@/services/administration/types';
import {
  warehousesService,
  type Warehouse,
  type WarehouseInput,
} from '@/services/inventory/warehouses.service';

const emptyForm: WarehouseInput = {
  branchId: '',
  name: '',
  code: '',
  description: '',
  isMain: false,
};

export default function WarehousesPage() {
  const { user } = useAuthSession();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [form, setForm] = useState<WarehouseInput>(emptyForm);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = user?.permissions.includes('warehouses.create') ?? false;
  const canUpdate = user?.permissions.includes('warehouses.update') ?? false;
  const canDelete = user?.permissions.includes('warehouses.delete') ?? false;

  async function load(filter = branchFilter) {
    setLoading(true);
    setError(null);
    try {
      const [warehouseRows, branchRows] = await Promise.all([
        warehousesService.list(filter || undefined),
        branchesService.list(),
      ]);
      setWarehouses(warehouseRows);
      setBranches(branchRows.filter((branch) => branch.is_active));
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(''), 0);
    return () => window.clearTimeout(timer);
    // Initial load only; subsequent loads use explicit branch selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  }

  function openEdit(warehouse: Warehouse) {
    setEditing(warehouse);
    setForm({
      branchId: warehouse.branch_id,
      name: warehouse.name,
      code: warehouse.code,
      description: warehouse.description ?? '',
      isMain: warehouse.is_main,
      isActive: warehouse.is_active,
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
        ...form,
        description: form.description || undefined,
      };
      if (editing) {
        await warehousesService.update(editing.id, input);
      } else {
        await warehousesService.create(input);
      }
      setOpen(false);
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(warehouse: Warehouse) {
    setError(null);
    try {
      if (warehouse.is_active) {
        if (!window.confirm(`¿Desactivar ${warehouse.name}?`)) return;
        await warehousesService.deactivate(warehouse.id);
      } else {
        await warehousesService.update(warehouse.id, { isActive: true });
      }
      await load();
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }

  if (loading && warehouses.length === 0) {
    return <LoadingState label="Cargando depósitos" />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Depósitos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ubicaciones de inventario asociadas a cada sucursal.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} disabled={branches.length === 0}>
            <Plus className="size-4" aria-hidden />
            Nuevo depósito
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
          <CardTitle>Depósitos de la empresa</CardTitle>
          <CardDescription>
            Un depósito con stock no puede desactivarse.
          </CardDescription>
          <select
            className="mt-3 h-8 max-w-sm rounded-lg border bg-background px-3 text-sm"
            value={branchFilter}
            onChange={(event) => {
              setBranchFilter(event.target.value);
              void load(event.target.value);
            }}
          >
            <option value="">Todas las sucursales</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <ErrorState
              title="Todavía no hay depósitos"
              description={
                branches.length === 0
                  ? 'Creá primero una sucursal activa.'
                  : 'Creá el primer depósito para comenzar a operar stock.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Unidades</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <WarehouseIcon
                          className="mt-0.5 size-4 text-muted-foreground"
                          aria-hidden
                        />
                        <div>
                          <p className="font-medium">{warehouse.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {warehouse.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{warehouse.branch.name}</TableCell>
                    <TableCell>{warehouse.product_count}</TableCell>
                    <TableCell>{warehouse.stored_units}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {warehouse.is_main ? (
                          <Badge variant="info">Principal</Badge>
                        ) : null}
                        <Badge
                          variant={warehouse.is_active ? 'success' : 'danger'}
                        >
                          {warehouse.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {canUpdate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(warehouse)}
                          >
                            Editar
                          </Button>
                        ) : null}
                        {canDelete || canUpdate ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void toggleActive(warehouse)}
                          >
                            {warehouse.is_active ? 'Desactivar' : 'Activar'}
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
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent>
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Editar depósito' : 'Nuevo depósito'}
              </DialogTitle>
              <DialogDescription>
                El código es único dentro de la empresa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field label="Sucursal">
                <select
                  required
                  className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                  value={form.branchId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      branchId: event.target.value,
                    }))
                  }
                >
                  <option value="">Seleccionar sucursal</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nombre">
                <Input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Código">
                <Input
                  required
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Descripción">
                <Input
                  value={form.description ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={form.isMain ?? false}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isMain: event.target.checked,
                    }))
                  }
                />
                Depósito principal de la sucursal
              </label>
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

function errorMessage(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'No se pudo completar la operación.';
}
