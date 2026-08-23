'use client';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { useCities } from '@/hooks/useCities';

import { MasterDataSelect } from './MasterDataSelect';

type CitySelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function CitySelect({ value, onChange, disabled }: CitySelectProps) {
  const { options, loading, error } = useCities();

  if (loading) {
    return <LoadingState label="Cargando ciudades" />;
  }

  if (error) {
    return <ErrorState description="No se pudieron cargar las ciudades." />;
  }

  return <MasterDataSelect id="city-id" name="cityId" value={value} options={options} placeholder="Seleccione una ciudad" onChange={onChange} disabled={disabled} />;
}

export { CitySelect };
