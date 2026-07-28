'use client';

import { getCompanyTypes } from '@/services/master-data/company-types.service';

import { useMasterData } from './use-master-data';

function useCompanyTypes() {
  return useMasterData(getCompanyTypes);
}

export { useCompanyTypes };
