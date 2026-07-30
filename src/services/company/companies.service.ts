import { apiFetch } from '@/services/api';

import type { ApiResponse, Company, CompanyUpdateInput } from './companies.types';

export const companiesService = {
  async getCurrent() {
    return (await apiFetch<ApiResponse<Company>>('/companies/current')).data;
  },
  async updateCurrent(input: CompanyUpdateInput) {
    return (
      await apiFetch<ApiResponse<Company>>('/companies/current', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
};
