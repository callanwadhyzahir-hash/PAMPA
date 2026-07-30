'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Save } from 'lucide-react';

import { CompanyTypeSelect } from '@/components/domain/master-data/CompanyTypeSelect';
import { CurrencySelect } from '@/components/domain/master-data/CurrencySelect';
import { TaxConditionSelect } from '@/components/domain/master-data/TaxConditionSelect';
import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthSession } from '@/hooks/use-auth-session';
import { ApiError } from '@/services/api';
import { companiesService } from '@/services/company/companies.service';
import type {
  Company,
  CompanyUpdateInput,
} from '@/services/company/companies.types';

export default function CurrentCompanyPage() {
  const { user } = useAuthSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyUpdateInput>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canUpdate = user?.permissions.includes('companies.update') ?? false;

  useEffect(() => {
    let active = true;
    companiesService
      .getCurrent()
      .then((current) => {
        if (!active) return;
        setCompany(current);
        setForm({
          companyTypeId: current.company_type_id,
          taxConditionId: current.tax_condition_id,
          currencyId: current.currency_id,
          name: current.name,
          legalName: current.legal_name ?? '',
          taxId: current.tax_id,
          email: current.email ?? '',
          phone: current.phone ?? '',
          website: current.website ?? '',
          logoUrl: current.logo_url ?? '',
        });
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'No se pudo cargar la empresa.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canUpdate) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await companiesService.updateCurrent(form);
      setCompany(updated);
      setSuccess('Los datos de la empresa se guardaron correctamente.');
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : 'No se pudieron guardar los cambios.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Cargando tu empresa" />;
  if (error && !company) {
    return <ErrorState title="No se pudo cargar tu empresa" description={error} />;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border bg-card p-2.5 text-primary">
          <Building2 className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mi empresa</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Datos fiscales, identidad y contacto de la organización actual.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Información de la empresa</CardTitle>
          <CardDescription>
            {canUpdate
              ? 'Los cambios se aplican únicamente a tu empresa.'
              : 'Tu cuenta tiene acceso de sólo lectura.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Razón social">
                <Input
                  value={form.name ?? ''}
                  disabled={!canUpdate || saving}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Nombre comercial">
                <Input
                  value={form.legalName ?? ''}
                  disabled={!canUpdate || saving}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      legalName: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="CUIT">
                <Input
                  value={form.taxId ?? ''}
                  disabled={!canUpdate || saving}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      taxId: event.target.value,
                    }))
                  }
                  required
                />
              </Field>
              <Field label="Correo">
                <Input
                  type="email"
                  value={form.email ?? ''}
                  disabled={!canUpdate || saving}
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
                  disabled={!canUpdate || saving}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Sitio web">
                <Input
                  value={form.website ?? ''}
                  disabled={!canUpdate || saving}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      website: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Tipo de empresa">
                <CompanyTypeSelect
                  value={form.companyTypeId ?? ''}
                  disabled={!canUpdate || saving}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      companyTypeId: value,
                    }))
                  }
                />
              </Field>
              <Field label="Condición fiscal">
                <TaxConditionSelect
                  value={form.taxConditionId ?? ''}
                  disabled={!canUpdate || saving}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      taxConditionId: value,
                    }))
                  }
                />
              </Field>
              <Field label="Moneda">
                <CurrencySelect
                  value={form.currencyId ?? ''}
                  disabled={!canUpdate || saving}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      currencyId: value,
                    }))
                  }
                />
              </Field>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="text-sm text-success" role="status">
                {success}
              </p>
            ) : null}
            {canUpdate ? (
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  <Save className="size-4" />
                  {saving ? 'Guardando' : 'Guardar cambios'}
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>
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
