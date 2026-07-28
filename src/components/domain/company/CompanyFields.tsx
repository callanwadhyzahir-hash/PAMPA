import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { FormGrid, FormSection } from '@/components/pampa-ui';
import { CompanyTypeSelect } from '@/components/domain/master-data/CompanyTypeSelect';
import { CurrencySelect } from '@/components/domain/master-data/CurrencySelect';
import { TaxConditionSelect } from '@/components/domain/master-data/TaxConditionSelect';

import type { CompanyFormValues } from './company-form.schema';

type CompanyFieldsProps = {
  values: Partial<CompanyFormValues>;
  register: UseFormRegister<CompanyFormValues>;
  setValue: UseFormSetValue<CompanyFormValues>;
  errors: FieldErrors<CompanyFormValues>;
  disabled?: boolean;
};

function FieldError({ message, id }: { message?: string; id: string }) {
  return message ? <p id={id} className="text-sm text-destructive">{message}</p> : null;
}

function CompanyFields({ values, register, setValue, errors, disabled = false }: CompanyFieldsProps) {
  return (
    <>
      <FormSection title="Datos de identificacion">
        <FormGrid>
          <label className="space-y-1.5 text-sm font-medium" htmlFor="company-name">
            Razón social
            <Input id="company-name" aria-invalid={Boolean(errors.name)} aria-describedby="company-name-error" maxLength={200} disabled={disabled} {...register('name')} />
            <FieldError id="company-name-error" message={errors.name?.message} />
          </label>
          <label className="space-y-1.5 text-sm font-medium" htmlFor="company-legal-name">
            Nombre comercial
            <Input id="company-legal-name" aria-invalid={Boolean(errors.legalName)} aria-describedby="company-legal-name-error" maxLength={250} disabled={disabled} {...register('legalName')} />
            <FieldError id="company-legal-name-error" message={errors.legalName?.message} />
          </label>
          <label className="space-y-1.5 text-sm font-medium" htmlFor="company-tax-id">
            CUIT
            <Input id="company-tax-id" aria-invalid={Boolean(errors.taxId)} aria-describedby="company-tax-id-error" inputMode="numeric" maxLength={13} disabled={disabled} {...register('taxId')} />
            <FieldError id="company-tax-id-error" message={errors.taxId?.message} />
          </label>
        </FormGrid>
      </FormSection>
      <FormSection title="Configuracion fiscal">
        <FormGrid>
          <div className="space-y-1.5 text-sm font-medium">
            <span>Tipo de empresa</span>
            <CompanyTypeSelect value={values.companyTypeId ?? ''} onChange={(value) => setValue('companyTypeId', value, { shouldDirty: true, shouldValidate: true })} disabled={disabled} />
            <FieldError id="company-type-id-error" message={errors.companyTypeId?.message} />
          </div>
          <div className="space-y-1.5 text-sm font-medium">
            <span>Condicion fiscal</span>
            <TaxConditionSelect value={values.taxConditionId ?? ''} onChange={(value) => setValue('taxConditionId', value, { shouldDirty: true, shouldValidate: true })} disabled={disabled} />
            <FieldError id="company-tax-condition-id-error" message={errors.taxConditionId?.message} />
          </div>
          <div className="space-y-1.5 text-sm font-medium">
            <span>Moneda</span>
            <CurrencySelect value={values.currencyId ?? ''} onChange={(value) => setValue('currencyId', value, { shouldDirty: true, shouldValidate: true })} disabled={disabled} />
            <FieldError id="company-currency-id-error" message={errors.currencyId?.message} />
          </div>
        </FormGrid>
      </FormSection>
      <FormSection title="Contacto">
        <FormGrid>
          <label className="space-y-1.5 text-sm font-medium" htmlFor="company-email">
            Email
            <Input id="company-email" type="email" aria-invalid={Boolean(errors.email)} aria-describedby="company-email-error" maxLength={255} disabled={disabled} {...register('email')} />
            <FieldError id="company-email-error" message={errors.email?.message} />
          </label>
          <label className="space-y-1.5 text-sm font-medium" htmlFor="company-phone">
            Telefono
            <Input id="company-phone" aria-invalid={Boolean(errors.phone)} aria-describedby="company-phone-error" maxLength={50} disabled={disabled} {...register('phone')} />
            <FieldError id="company-phone-error" message={errors.phone?.message} />
          </label>
          <label className="space-y-1.5 text-sm font-medium" htmlFor="company-website">
            Sitio web
            <Input id="company-website" type="url" aria-invalid={Boolean(errors.website)} aria-describedby="company-website-error" maxLength={255} disabled={disabled} {...register('website')} />
            <FieldError id="company-website-error" message={errors.website?.message} />
          </label>
          <label className="space-y-1.5 text-sm font-medium" htmlFor="company-logo-url">
            URL del logo
            <Input id="company-logo-url" type="url" aria-invalid={Boolean(errors.logoUrl)} aria-describedby="company-logo-url-error" disabled={disabled} {...register('logoUrl')} />
            <FieldError id="company-logo-url-error" message={errors.logoUrl?.message} />
          </label>
        </FormGrid>
        <label className="flex items-center gap-2 text-sm font-medium" htmlFor="company-is-active">
          <Input id="company-is-active" type="checkbox" disabled={disabled} className="size-4" {...register('isActive')} />
          Empresa activa
        </label>
      </FormSection>
    </>
  );
}

export { CompanyFields };
