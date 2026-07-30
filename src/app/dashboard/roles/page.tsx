'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { KeyRound, Plus, ShieldCheck } from 'lucide-react';

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
import { rolesService } from '@/services/administration/roles.service';
import type {
  PermissionSummary,
  RoleDetail,
} from '@/services/administration/types';

export default function RolesPage() {
  const { user } = useAuthSession();
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [permissions, setPermissions] = useState<PermissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionTarget, setPermissionTarget] = useState<RoleDetail | null>(
    null,
  );
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canCreate = user?.permissions.includes('roles.create') ?? false;
  const canUpdate = user?.permissions.includes('roles.update') ?? false;
  const canDelete = user?.permissions.includes('roles.delete') ?? false;
  const canAssign =
    user?.permissions.includes('roles.assign_permissions') ?? false;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [roleRows, permissionRows] = await Promise.all([
        rolesService.list(),
        rolesService.listPermissions(),
      ]);
      setRoles(roleRows);
      setPermissions(permissionRows);
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

  const permissionGroups = useMemo(() => {
    return permissions.reduce<Record<string, PermissionSummary[]>>(
      (groups, permission) => {
        (groups[permission.module] ??= []).push(permission);
        return groups;
      },
      {},
    );
  }, [permissions]);

  async function createRole(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await rolesService.create({
        name,
        description: description || undefined,
      });
      setCreateOpen(false);
      setName('');
      setDescription('');
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  function openPermissions(role: RoleDetail) {
    setPermissionTarget(role);
    setSelectedPermissions(
      role.role_permission.map(({ permission }) => permission.id),
    );
  }

  async function savePermissions() {
    if (!permissionTarget) return;
    setSaving(true);
    setError(null);
    try {
      await rolesService.replacePermissions(
        permissionTarget.id,
        selectedPermissions,
      );
      setPermissionTarget(null);
      await load();
    } catch (reason) {
      setError(message(reason));
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(role: RoleDetail) {
    if (!window.confirm(`¿Querés eliminar el rol ${role.name}?`)) return;
    setError(null);
    try {
      await rolesService.remove(role.id);
      await load();
    } catch (reason) {
      setError(message(reason));
    }
  }

  if (loading && roles.length === 0) {
    return <LoadingState label="Cargando roles" />;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Permisos y responsabilidades dentro de tu empresa.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nuevo rol
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
          <CardTitle>Roles de la empresa</CardTitle>
          <CardDescription>
            Los roles del sistema son visibles pero no editables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <ErrorState
              title="No hay roles"
              description="Ejecutá el bootstrap RBAC o creá un rol personalizado."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rol</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <p className="font-medium">
                        {role.system_code ?? role.name}
                      </p>
                      <p className="max-w-sm truncate text-xs text-muted-foreground">
                        {role.description ?? 'Sin descripción'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.is_system ? 'info' : 'default'}>
                        {role.is_system ? 'Sistema' : 'Personalizado'}
                      </Badge>
                    </TableCell>
                    <TableCell>{role.role_permission.length}</TableCell>
                    <TableCell>{role._count.user_role}</TableCell>
                    <TableCell>
                      <Badge variant={role.is_active ? 'success' : 'danger'}>
                        {role.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {canAssign && !role.is_system ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPermissions(role)}
                          >
                            <KeyRound className="size-3.5" />
                            Permisos
                          </Button>
                        ) : null}
                        {canDelete && !role.is_system ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void removeRole(role)}
                          >
                            Eliminar
                          </Button>
                        ) : null}
                        {canUpdate && role.is_system ? (
                          <span className="self-center text-xs text-muted-foreground">
                            Protegido
                          </span>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={createRole}>
            <DialogHeader>
              <DialogTitle>Crear rol personalizado</DialogTitle>
              <DialogDescription>
                Los nombres reservados del sistema no están permitidos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <label className="space-y-1.5 text-sm font-medium">
                <span>Nombre</span>
                <Input
                  required
                  minLength={2}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                <span>Descripción</span>
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
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
                {saving ? 'Creando' : 'Crear rol'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(permissionTarget)}
        onOpenChange={(open) => !open && setPermissionTarget(null)}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Permisos de {permissionTarget?.name}
            </DialogTitle>
            <DialogDescription>
              Los permisos administrativos reservados requieren OWNER.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-5 overflow-y-auto py-2">
            {Object.entries(permissionGroups).map(([module, moduleItems]) => (
              <section key={module}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {module.replaceAll('_', ' ')}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {moduleItems.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-4"
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={(event) =>
                          setSelectedPermissions((current) =>
                            event.target.checked
                              ? [...current, permission.id]
                              : current.filter((id) => id !== permission.id),
                          )
                        }
                      />
                      <span>
                        <span className="block text-sm font-medium">
                          {permission.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {permission.code}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionTarget(null)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void savePermissions()}>
              Guardar permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function message(reason: unknown) {
  return reason instanceof ApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : 'No se pudo completar la operación.';
}
