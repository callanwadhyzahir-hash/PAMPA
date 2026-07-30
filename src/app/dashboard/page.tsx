'use client';

import { useEffect, useState } from 'react';
import { Building2, GitBranch, ShieldCheck, Users } from 'lucide-react';

import { SectionTitle } from '@/components/dashboard/section-title';
import { StatCard } from '@/components/dashboard/stat-card';
import { PageContainer } from '@/components/layout/page-container';
import { ErrorState, LoadingState } from '@/components/pampa-ui';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { branchesService } from '@/services/administration/branches.service';
import { rolesService } from '@/services/administration/roles.service';
import { usersService } from '@/services/administration/users.service';
import { companiesService } from '@/services/company/companies.service';

interface Summary {
  companyName: string;
  users: number;
  activeUsers: number;
  roles: number;
  branches: number;
  activeBranches: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      companiesService.getCurrent(),
      usersService.list(),
      rolesService.list(),
      branchesService.list(),
    ])
      .then(([company, users, roles, branches]) => {
        if (!active) return;
        setSummary({
          companyName: company.name,
          users: users.length,
          activeUsers: users.filter((user) => user.is_active).length,
          roles: roles.length,
          branches: branches.length,
          activeBranches: branches.filter((branch) => branch.is_active).length,
        });
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'No se pudo cargar el resumen.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!summary && !error) {
    return <LoadingState label="Preparando el dashboard" />;
  }

  return (
    <PageContainer className="space-y-8">
      <SectionTitle
        title="Dashboard"
        description="Estado actual de identidad y administración de tu empresa."
      />

      {error ? (
        <ErrorState title="No se pudo cargar el resumen" description={error} />
      ) : null}

      {summary ? (
        <>
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Indicadores de administración"
          >
            <StatCard
              label="Empresa"
              value={summary.companyName}
              detail="Tenant autenticado"
              icon={<Building2 className="size-5" />}
            />
            <StatCard
              label="Usuarios activos"
              value={summary.activeUsers.toString()}
              detail={`${summary.users} registrados`}
              icon={<Users className="size-5" />}
            />
            <StatCard
              label="Roles"
              value={summary.roles.toString()}
              detail="Sistema y personalizados"
              icon={<ShieldCheck className="size-5" />}
            />
            <StatCard
              label="Sucursales activas"
              value={summary.activeBranches.toString()}
              detail={`${summary.branches} registradas`}
              icon={<GitBranch className="size-5" />}
            />
          </section>

          <Card>
            <CardHeader className="border-b">
              <CardTitle>Administración habilitada</CardTitle>
              <CardDescription>
                PAMPA ya opera con datos reales de la empresa autenticada.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Mi empresa', 'Identidad fiscal y contacto'],
                ['Usuarios', 'Accesos y estado de cuentas'],
                ['Roles', 'Permisos y protección OWNER'],
                ['Sucursales', 'Ubicaciones y principal activa'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-xl border p-4">
                  <p className="font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </PageContainer>
  );
}
