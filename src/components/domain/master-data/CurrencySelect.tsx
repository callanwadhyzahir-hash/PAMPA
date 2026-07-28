'use client';

import { ErrorState, LoadingState } from '@/components/pampa-ui';
import { useCurrencies } from '@/hooks/useCurrencies';

import { MasterDataSelect } from './MasterDataSelect';

type CurrencySelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function CurrencySelect({ value, onChange, disabled }: CurrencySelectProps) {
  const { options, loading, error } = useCurrencies();

  if (loading) {
    return <LoadingState label="Cargando monedas" />;
  }

  if (error) {
    return <ErrorState description="No se pudieron cargar las monedas." />;
  }

  return <MasterDataSelect id="company-currency-id" name="currencyId" value={value} options={options} placeholder="Seleccione una moneda" onChange={onChange} disabled={disabled} />;
}

export { CurrencySelect };
