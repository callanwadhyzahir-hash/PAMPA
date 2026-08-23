'use client';

import { getCities } from '@/services/master-data/cities.service';

import { useMasterData } from './use-master-data';

function useCities() {
  return useMasterData(getCities);
}

export { useCities };
