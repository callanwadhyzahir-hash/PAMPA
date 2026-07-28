'use client';

import { getCurrencies } from '@/services/master-data/currencies.service';

import { useMasterData } from './use-master-data';

function useCurrencies() {
  return useMasterData(getCurrencies);
}

export { useCurrencies };
