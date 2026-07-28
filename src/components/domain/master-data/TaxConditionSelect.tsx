'use client';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { useTaxConditions } from '@/hooks/useTaxConditions';

import { MasterDataSelect } from './MasterDataSelect';

type TaxConditionSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function TaxConditionSelect({ value, onChange, disabled }: TaxConditionSelectProps) {
  const { options, loading, error } = useTaxConditions();

  if (loading) {
    return <LoadingState label="Cargando condiciones fiscales" />;
  }

  if (error) {
    return <ErrorState description="No se pudieron cargar las condiciones fiscales." />;
  }

  return <MasterDataSelect id="company-tax-condition-id" name="taxConditionId" value={value} options={options} placeholder="Seleccione una condición fiscal" onChange={onChange} disabled={disabled} />;
}

export { TaxConditionSelect };
