'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Contact, ExternalLink, Plus, Search } from 'lucide-react';
import Link from 'next/link';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  clientsService,
  type Client,
  type ClientInput,
} from '@/services/commercial/clients.service';

const emptyForm: ClientInput = {
  code: '',
  firstName: '',
  lastName: '',
  businessName: '',
  taxId: '',
  email: '',
  phone: '',
  mobile: '',
  isCompany: false,
  creditLimit: 0,
  notes: '',
  isActive: true,
};

export default function ClientsPage() {
  const { user } = useAuthSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientInput>(emptyForm);

  const canCreate = user?.permissions.includes('clients.create') ?? false;
  const canUpdate = user?.permissions.includes('clients.update') ?? false;
  const canDelete = user?.permissions.includes('clients.delete') ?? false;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setClients(await clientsService.list());
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

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    if (!term) return clients;
    return clients.filter((client) =>
      `${displayName(client)} ${client.code} ${client.tax_id ?? ''}`
        .toLocaleLowerCase('es')
        .includes(term),
    );
  }, [clients, search]);

  function edit(client: Client) {
    setEditing(client);
    setForm({
      code: client.code,
      firstName: client.first_name ?? '',
      lastName: client.last_name ?? '',
      businessName: client.business_name ?? '',
      taxId: client.tax_id ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      mobile: client.mobile ?? '',
      isCompany: client.is_company,
      creditLimit: Number(client.credit_limit),
      notes: client.notes ?? '',
      isActive: client.is_active,
    });
    setError(null);
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const input = Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          typeof value === 'string' && !value ? undefined : value,
        ]),
      ) as unknown as ClientInput;
      if (editing) await clientsService.update(editing.id, input);
      else await clientsService.create(input);
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(client: Client) {
    setError(null);
    try {
      if (client.is_active) {
        if (!window.confirm(`¿Desactivar ${displayName(client)}?`)) return;
        await clientsService.deactivate(client.id);
      } else {
        await clientsService.update(client.id, { isActive: true });
      }
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  }

  if (loading && clients.length === 0) {
    return <LoadingState label="Cargando clientes" />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personas, empresas e historial comercial.
          </p>
        </div>
        {canCreate ? (
          <Button
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Nuevo cliente
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
          <CardTitle>Clientes de la empresa</CardTitle>
          <label className="relative mt-3 max-w-md">
            <Search className="absolute left-3 top-2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Nombre, código o CUIT"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <ErrorState
              title="No hay clientes"
              description="Creá el primer cliente o modificá la búsqueda."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CUIT / documento</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Ventas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <Contact className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{displayName(client)}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.code}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.is_company ? 'Empresa' : 'Persona'}
                    </TableCell>
                    <TableCell>{client.tax_id ?? '—'}</TableCell>
                    <TableCell>{client.email ?? client.phone ?? '—'}</TableCell>
                    <TableCell>{client._count.sale}</TableCell>
                    <TableCell>
                      <Badge variant={client.is_active ? 'success' : 'danger'}>
                        {client.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link
                          className={buttonVariants({
                            size: 'sm',
                            variant: 'ghost',
                          })}
                          href={`/dashboard/clients/${client.id}`}
                        >
                          <ExternalLink className="size-3.5" />
                          Ver
                        </Link>
                        {canUpdate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => edit(client)}
                          >
                            Editar
                          </Button>
                        ) : null}
                        {canDelete || canUpdate ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void toggle(client)}
                          >
                            {client.is_active ? 'Desactivar' : 'Activar'}
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
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={save}>
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Editar cliente' : 'Nuevo cliente'}
              </DialogTitle>
              <DialogDescription>
                Los datos fiscales son internos; no se validan contra ARCA.
              </DialogDescription>
            </DialogHeader>
            <div className="grid max-h-[65vh] gap-4 overflow-y-auto py-4 sm:grid-cols-2">
              <Field label="Código">
                <Input
                  required
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value })
                  }
                />
              </Field>
              <Field label="Tipo">
                <select
                  className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                  value={form.isCompany ? 'company' : 'person'}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      isCompany: event.target.value === 'company',
                    })
                  }
                >
                  <option value="person">Persona / consumidor final</option>
                  <option value="company">Empresa</option>
                </select>
              </Field>
              {form.isCompany ? (
                <Field label="Razón social">
                  <Input
                    required
                    value={form.businessName ?? ''}
                    onChange={(event) =>
                      setForm({ ...form, businessName: event.target.value })
                    }
                  />
                </Field>
              ) : (
                <>
                  <Field label="Nombre">
                    <Input
                      value={form.firstName ?? ''}
                      onChange={(event) =>
                        setForm({ ...form, firstName: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Apellido">
                    <Input
                      value={form.lastName ?? ''}
                      onChange={(event) =>
                        setForm({ ...form, lastName: event.target.value })
                      }
                    />
                  </Field>
                </>
              )}
              {(['taxId', 'email', 'phone', 'mobile'] as const).map((key) => (
                <Field
                  key={key}
                  label={{
                    taxId: 'CUIT / documento',
                    email: 'Correo',
                    phone: 'Teléfono',
                    mobile: 'Celular',
                  }[key]}
                >
                  <Input
                    type={key === 'email' ? 'email' : 'text'}
                    value={String(form[key] ?? '')}
                    onChange={(event) =>
                      setForm({ ...form, [key]: event.target.value })
                    }
                  />
                </Field>
              ))}
              <Field label="Límite de crédito">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.creditLimit ?? 0}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      creditLimit: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Observaciones">
                <Input
                  value={form.notes ?? ''}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                />
              </Field>
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

function displayName(client: Client) {
  return (
    client.business_name ??
    [client.first_name, client.last_name].filter(Boolean).join(' ') ??
    client.code
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
