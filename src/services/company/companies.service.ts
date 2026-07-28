import { apiFetch } from '@/services/api';

import type {
  ApiResponse,
  CompaniesService,
  Company,
} from './companies.types';

function toCrudResponse<T>(response: ApiResponse<T>) {
  return {
    data: response.data,
    message: response.message,
    success: response.success,
  };
}

const companiesService: CompaniesService = {
  async list() {
    return toCrudResponse(await apiFetch<ApiResponse<Company[]>>('/companies'));
  },
  async create(input) {
    return toCrudResponse(
      await apiFetch<ApiResponse<Company>>('/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
  },
  async update(id, input) {
    return toCrudResponse(
      await apiFetch<ApiResponse<Company>>(`/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
  },
  async remove(id) {
    return toCrudResponse(
      await apiFetch<ApiResponse<Company>>(`/companies/${id}`, { method: 'DELETE' }),
    );
  },
};

export { companiesService };
