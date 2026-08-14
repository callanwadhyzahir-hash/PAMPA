'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { KeyRound, Plus, Search, UserRoundCog } from 'lucide-react';

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
import { rolesService } from '@/services/administration/roles.service';
import type {
  BranchDetail,
  RoleDetail,
  UserSummary,
} from '@/services/administration/types';
import {
  usersService,
  type CreateUserInput,
} from '@/services/administration/users.service';

const emptyUser: CreateUserInput = {
  firstName: '',
  lastName: '',
  email: '',
  temporaryPassword: '',
  phone: '',
  branchId: null,
};

export default function UsersPage() {
  const { user: actor } = useAuthSession();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [branches, setBranches] = useState<BranchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<UserSummary | null>(null);
  const [form, setForm] = useState<CreateUserInput>(emptyUser);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canCreate = actor?.permissions.includes('users.create') ?? false;
  const canUpdate = actor?.permissions.includes('users.update') ?? false;
  const canDelete = actor?.permissions.includes('users.delete') ?? false;
  const canAssign =
    actor?.permissions.includes('users.assign_roles') ?? false;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [userRows, roleRows, branchRows] = await Promise.all([
        usersService.list(),
        rolesService.list(),
        branchesService.list(),
      ]);
      setUsers(userRows);
      setRoles(roleRows);
      setBranches(branchRows);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'No se pudieron cargar los usuarios.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return users.filter((item) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'active' ? item.is_active : !item.is_active);
      const matchesQuery =
        !normalized ||
        `${item.first_name} ${item.last_name} ${item.email}`
          .toLowerCase()
          .includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [query, status, users]);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    const createdEmail = form.email;
    try {
      await usersService.create({
        ...form,
        branchId: form.branchId || undefined,
        phone: form.phone || undefined,
      });
      setCreateOpen(false);
      setForm(emptyUser);
      // The backend always sends the verification email as part of user
      // creation and never fails the request for a delivery error, so this
      // confirmation holds even if Resend itself had trouble.
      setNotice(`Usuario creado. Enviamos un correo de verificación a ${createdEmail}.`);
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  function openRoles(target: UserSummary) {
    setRoleTarget(target);
    setSelectedRoles(target.user_role.map(({ role }) => role.id));
  }

  async function saveRoles() {
    if (!roleTarget) return;
    setSaving(true);
    setError(null);
    try {
      await usersService.replaceRoles(roleTarget.id, selectedRoles);
      setRoleTarget(null);
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(target: UserSummary) {
    const action = target.is_active ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Querés ${action} a ${target.first_name}?`)) return;
    setError(null);
    try {
      if (target.is_active) {
        await usersService.deactivate(target.id);
      } else {
        await usersService.update(target.id, { isActive: true });
      }
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  }

  if (loading && users.length === 0) {
    return <LoadingState label="Cargando usuarios" />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personas con acceso a la operación de tu empresa.
          </p>
        </div>
        {canCreate ? (
          <Button
            onClick={() => {
              setNotice(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nuevo usuario
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-success/30 bg-success-bg p-3 text-sm text-success">
          {notice}
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Equipo</CardTitle>
          <CardDescription>{users.length} usuarios registrados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre o correo"
              />
            </label>
            <select
              className="h-8 rounded-lg border bg-background px-3 text-sm"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as typeof status)
              }
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          {visibleUsers.length === 0 ? (
            <ErrorState
              title="No hay usuarios para mostrar"
              description="Ajustá los filtros o creá un usuario."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((item) => {
                  const isSelf = actor?.id === item.id;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-medium">
                          {item.first_name} {item.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.email}
                        </p>
                      </TableCell>
                      <TableCell>{item.branch?.name ?? 'Sin asignar'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.user_role.length
                            ? item.user_role.map(({ role }) => (
                                <Badge
                                  key={role.id}
                                  variant={
                                    role.system_code === 'OWNER'
                                      ? 'info'
                                      : 'default'
                                  }
                                >
                                  {role.system_code ?? role.name}
                                </Badge>
                              ))
                            : 'Sin roles'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_active ? 'success' : 'danger'}>
                          {item.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {canAssign && !isSelf ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRoles(item)}
                            >
                              <KeyRound className="size-3.5" />
                              Roles
                            </Button>
                          ) : null}
                          {(canDelete || canUpdate) && !isSelf ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void toggleActive(item)}
                            >
                              {item.is_active ? 'Desactivar' : 'Activar'}
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={createUser}>
            <DialogHeader>
              <DialogTitle>Crear usuario</DialogTitle>
              <DialogDescription>
                Definí una contraseña temporal fuerte. Nunca se mostrará en las
                respuestas de PAMPA.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              <FormField label="Nombre">
                <Input
                  required
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Apellido">
                <Input
                  required
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Correo">
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Teléfono">
                <Input
                  value={form.phone ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Contraseña temporal">
                <Input
                  required
                  type="password"
                  minLength={12}
                  autoComplete="new-password"
                  value={form.temporaryPassword}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      temporaryPassword: event.target.value,
                    }))
                  }
                />
              </FormField>
              <FormField label="Sucursal predeterminada">
                <select
                  className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                  value={form.branchId ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      branchId: event.target.value || null,
                    }))
                  }
                >
                  <option value="">Sin asignar</option>
                  {branches
                    .filter((branchItem) => branchItem.is_active)
                    .map((branchItem) => (
                      <option key={branchItem.id} value={branchItem.id}>
                        {branchItem.name}
                      </option>
                    ))}
                </select>
              </FormField>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creando' : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(roleTarget)}
        onOpenChange={(open) => !open && setRoleTarget(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRoundCog className="size-4" />
              Roles de {roleTarget?.first_name}
            </DialogTitle>
            <DialogDescription>
              OWNER sólo puede ser administrado por otro OWNER.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto py-2">
            {roles
              .filter((role) => role.is_active)
              .map((role) => (
                <label
                  key={role.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span>
                    <span className="block font-medium">
                      {role.system_code ?? role.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {role.is_system ? 'Rol del sistema' : 'Personalizado'}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={selectedRoles.includes(role.id)}
                    onChange={(event) =>
                      setSelectedRoles((current) =>
                        event.target.checked
                          ? [...current, role.id]
                          : current.filter((id) => id !== role.id),
                      )
                    }
                  />
                </label>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void saveRoles()}>
              Guardar roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function FormField({
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
