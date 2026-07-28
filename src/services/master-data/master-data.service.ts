import { apiFetch } from '@/services/api';

import type { ApiResponse, MasterDataApiRecord, MasterDataOption } from './master-data.types';

function createCachedMasterDataLoader(path: string) {
  let cache: Promise<MasterDataOption[]> | null = null;

  return () => {
    if (!cache) {
      cache = apiFetch<ApiResponse<MasterDataApiRecord[]>>(path)
        .then((response) => response.data
          .map((record) => ({
            id: record.id,
            label: record.name,
            ...(record.code ? { code: record.code } : {}),
          }))
          .sort((left, right) => left.label.localeCompare(right.label, 'es')))
        .catch((cause: unknown) => {
          cache = null;
          throw cause;
        });
    }

    return cache;
  };
}

export { createCachedMasterDataLoader };
