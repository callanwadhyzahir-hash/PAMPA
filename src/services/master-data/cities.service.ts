import { citiesService } from '@/services/administration/cities.service';

import type { MasterDataOption } from './master-data.types';

let cache: Promise<MasterDataOption[]> | null = null;

function getCities(): Promise<MasterDataOption[]> {
  if (!cache) {
    cache = citiesService
      .list()
      .then((cities) => cities
        .map((city) => ({
          id: city.id,
          label: `${city.name}, ${city.state.name}`,
          ...(city.postal_code ? { code: city.postal_code } : {}),
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es')))
      .catch((cause: unknown) => {
        cache = null;
        throw cause;
      });
  }

  return cache;
}

export { getCities };
