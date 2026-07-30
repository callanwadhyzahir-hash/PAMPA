import { apiFetch } from '@/services/api';

import type { ApiEnvelope, BranchDetail } from './types';

export interface BranchAddressInput {
  cityId: string;
  street: string;
  number?: string;
  floor?: string;
  apartment?: string;
  neighborhood?: string;
  zipCode?: string;
  observations?: string;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  isMain?: boolean;
  address: BranchAddressInput;
}

export type UpdateBranchInput = Partial<CreateBranchInput> & {
  isActive?: boolean;
};

export const branchesService = {
  async list() {
    return (await apiFetch<ApiEnvelope<BranchDetail[]>>('/branches')).data;
  },
  async create(input: CreateBranchInput) {
    return (
      await apiFetch<ApiEnvelope<BranchDetail>>('/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async update(id: string, input: UpdateBranchInput) {
    return (
      await apiFetch<ApiEnvelope<BranchDetail>>(`/branches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  deactivate(id: string) {
    return apiFetch<void>(`/branches/${id}`, { method: 'DELETE' });
  },
};
