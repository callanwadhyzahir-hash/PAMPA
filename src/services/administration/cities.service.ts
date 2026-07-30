import { apiFetch } from '@/services/api';

import type { ApiEnvelope } from './types';

export interface CityOption {
  id: string;
  name: string;
  postal_code: string | null;
  state: {
    id: string;
    name: string;
    country: { id: string; name: string; iso_code: string };
  };
}

export const citiesService = {
  async list() {
    return (await apiFetch<ApiEnvelope<CityOption[]>>('/cities')).data;
  },
};
