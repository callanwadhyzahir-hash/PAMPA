'use client';

import { getTaxConditions } from '@/services/master-data/tax-conditions.service';

import { useMasterData } from './use-master-data';

function useTaxConditions() {
  return useMasterData(getTaxConditions);
}

export { useTaxConditions };
