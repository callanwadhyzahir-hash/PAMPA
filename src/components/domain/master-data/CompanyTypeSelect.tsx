'use client';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { useCompanyTypes } from '@/hooks/useCompanyTypes';

import { MasterDataSelect } from './MasterDataSelect';

type CompanyTypeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function CompanyTypeSelect({ value, onChange, disabled }: CompanyTypeSelectProps) {
  const { options, loading, error } = useCompanyTypes();

  if (loading) {
    return <LoadingState label="Cargando tipos de empresa" />;
  }

  if (error) {
    return <ErrorState description="No se pudieron cargar los tipos de empresa." />;
  }

  return <MasterDataSelect id="company-type-id" name="companyTypeId" value={value} options={options} placeholder="Seleccione un tipo de empresa" onChange={onChange} disabled={disabled} />;
}

export { CompanyTypeSelect };
