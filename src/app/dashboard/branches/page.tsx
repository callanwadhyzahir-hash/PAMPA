'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Building, MapPin, Plus } from 'lucide-react';

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
  branchesService,
  type CreateBranchInput,
} from '@/services/administration/branches.service';
import {
  citiesService,
  type CityOption,
} from '@/services/administration/cities.service';
import type { BranchDetail } from '@/services/administration/types';

const emptyBranch: CreateBranchInput = {
  name: '',
  code: '',
  email: '',
  phone: '',
  isMain: false,
  address: {
    cityId: '',
    street: '',
    number: '',
    neighborhood: '',
    zipCode: '',
  },
};

export default function BranchesPage() {
  const { user } = useAuthSession();
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateBranchInput>(emptyBranch);
  const [saving, setSaving] = useState(false);

  const canCreate = user?.permissions.includes('branches.create') ?? false;
  const canUpdate = user?.permissions.includes('branches.update') ?? false;
  const canDelete = user?.permissions.includes('branches.delete') ?? false;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [branchRows, cityRows] = await Promise.all([
        branchesService.list(),
        citiesService.list(),
      ]);
      setBranches(branchRows);
      setCities(cityRows);
    } catch (reason) {
      setError(message(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createBranch(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await branchesService.create({
        ...form,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: {
          ...form.address,
          number: form.address.number || undefined,
          neighborhood: form.address.neighborhood || undefined,
          zipCode: form.address.zipCode || undefined,
        },
      });
      setOpen(false);
      setForm(emptyBranch);
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  async function makeMain(branch: BranchDetail) {
    if (!window.confirm(`¿Marcar ${branch.name} como sucursal principal?`)) {
      return;
    }
    setError(null);
    try {
      await branchesService.update(branch.id, { isMain: true });
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  }

  async function toggleActive(branch: BranchDetail) {
    const action = branch.is_active ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Querés ${action} ${branch.name}?`)) return;
    setError(null);
    try {
      if (branch.is_active) {
        await branchesService.deactivate(branch.id);
      } else {
        await branchesService.update(branch.id, { isActive: true });
      }
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  }

  if (loading && branches.length === 0) {
    return <LoadingState label="Cargando sucursales" />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sucursales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ubicaciones operativas y sucursal predeterminada de la empresa.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nueva sucursal
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
          <CardTitle>Ubicaciones</CardTitle>
          <CardDescription>
            Sólo puede existir una sucursal principal activa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <ErrorState
              title="Todavía no hay sucursales"
              description="Creá la primera ubicación operativa de la empresa."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Relaciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <Building className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{branch.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {branch.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                        <span>
                          {branch.address.street}{' '}
                          {branch.address.number ?? ''}
                          <span className="block text-xs text-muted-foreground">
                            {branch.address.city.name},{' '}
                            {branch.address.city.state.name}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {branch._count.user} usuarios · {branch._count.warehouse}{' '}
                      depósitos
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {branch.is_main ? (
                          <Badge variant="info">Principal</Badge>
                        ) : null}
                        <Badge variant={branch.is_active ? 'success' : 'danger'}>
                          {branch.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {canUpdate && branch.is_active && !branch.is_main ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void makeMain(branch)}
                          >
                            Hacer principal
                          </Button>
                        ) : null}
                        {(canDelete || canUpdate) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void toggleActive(branch)}
                          >
                            {branch.is_active ? 'Desactivar' : 'Activar'}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={createBranch}>
            <DialogHeader>
              <DialogTitle>Nueva sucursal</DialogTitle>
              <DialogDescription>
                La dirección se crea como parte de esta sucursal.
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[65vh] gap-4 overflow-y-auto py-4 sm:grid-cols-2">
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
                  maxLength={20}
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      code: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Correo">
                <Input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Teléfono">
                <Input
                  value={form.phone ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Ciudad">
                <select
                  required
                  className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                  value={form.address.cityId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: {
                        ...current.address,
                        cityId: event.target.value,
                      },
                    }))
                  }
                >
                  <option value="">Seleccionar ciudad</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name} · {city.state.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Calle">
                <Input
                  required
                  value={form.address.street}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: {
                        ...current.address,
                        street: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Número">
                <Input
                  value={form.address.number ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: {
                        ...current.address,
                        number: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Barrio">
                <Input
                  value={form.address.neighborhood ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: {
                        ...current.address,
                        neighborhood: event.target.value,
                      },
                    }))
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={form.isMain ?? false}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isMain: event.target.checked,
                    }))
                  }
                />
                Marcar como sucursal principal
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
                {saving ? 'Creando' : 'Crear sucursal'}
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

function message(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'No se pudo completar la operación.';
}
