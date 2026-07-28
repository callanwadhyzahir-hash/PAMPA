'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { EntityForm, FormActions } from '@/components/pampa-ui';
import type { EntityFormContext } from '@/components/pampa-ui';
import type { Company, CompanyCreateInput, CompanyUpdateInput } from '@/services/company/companies.types';

import { CompanyFields } from './CompanyFields';
import { companyFormSchema, type CompanyFormValues } from './company-form.schema';

const emptyValues: CompanyFormValues = {
  companyTypeId: '',
  taxConditionId: '',
  currencyId: '',
  name: '',
  legalName: '',
  taxId: '',
  email: '',
  phone: '',
  website: '',
  logoUrl: '',
  isActive: true,
};

function toFormValues(company: Company | null): CompanyFormValues {
  if (!company) {
    return emptyValues;
  }

  return {
    companyTypeId: company.company_type_id,
    taxConditionId: company.tax_condition_id,
    currencyId: company.currency_id,
    name: company.name,
    legalName: company.legal_name ?? '',
    taxId: company.tax_id,
    email: company.email ?? '',
    phone: company.phone ?? '',
    website: company.website ?? '',
    logoUrl: company.logo_url ?? '',
    isActive: company.is_active,
  };
}

function optional(value: string) {
  return value.trim() || undefined;
}

function toInput(values: CompanyFormValues): CompanyCreateInput {
  return {
    companyTypeId: values.companyTypeId,
    taxConditionId: values.taxConditionId,
    currencyId: values.currencyId,
    name: values.name.trim(),
    legalName: optional(values.legalName),
    taxId: values.taxId.replaceAll('-', '').trim(),
    email: optional(values.email),
    phone: optional(values.phone),
    website: optional(values.website),
    logoUrl: optional(values.logoUrl),
    isActive: values.isActive,
  };
}

type CompanyFormProps = EntityFormContext<Company, CompanyCreateInput, CompanyUpdateInput>;

function CompanyForm({ mode, item, crud, close }: CompanyFormProps) {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toFormValues(item),
  });
  const values = useWatch({
    control: form.control,
    defaultValue: toFormValues(item),
  });

  useEffect(() => {
    form.reset(toFormValues(item));
  }, [form, item]);

  const handleSubmit = async (values: CompanyFormValues) => {
    form.clearErrors('root.server');

    const input = toInput(values);
    const saved = mode === 'edit' && item
      ? await crud.update(item.id, input)
      : await crud.create(input);

    if (saved) {
      close();
      return;
    }

    form.setError('root.server', {
      message: crud.error?.message ?? 'No se pudo guardar la empresa. Intentá nuevamente.',
    });
  };

  return (
    <EntityForm onSubmit={form.handleSubmit(handleSubmit)} noValidate>
      <CompanyFields
        values={values}
        register={form.register}
        setValue={form.setValue}
        errors={form.formState.errors}
        disabled={crud.loading}
      />
      {form.formState.errors.root?.server?.message ? (
        <p className="text-sm text-destructive" role="alert">
          {form.formState.errors.root.server.message}
        </p>
      ) : null}
      <FormActions>
        <Button type="button" variant="outline" onClick={close} disabled={crud.loading}>Cancelar</Button>
        <Button type="submit" disabled={crud.loading}>
          {crud.loading ? 'Guardando' : mode === 'edit' ? 'Guardar cambios' : 'Crear empresa'}
        </Button>
      </FormActions>
    </EntityForm>
  );
}

export { CompanyForm };
