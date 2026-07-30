import { apiFetch } from '@/services/api';

import type {
  ApiEnvelope,
  RoleSummary,
  UserSummary,
} from './types';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  temporaryPassword: string;
  phone?: string;
  branchId?: string | null;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  branchId?: string | null;
  isActive?: boolean;
}

export const usersService = {
  async list() {
    return (await apiFetch<ApiEnvelope<UserSummary[]>>('/users')).data;
  },
  async create(input: CreateUserInput) {
    return (
      await apiFetch<ApiEnvelope<UserSummary>>('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async update(id: string, input: UpdateUserInput) {
    return (
      await apiFetch<ApiEnvelope<UserSummary>>(`/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  deactivate(id: string) {
    return apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
  },
  async getRoles(id: string) {
    return (
      await apiFetch<ApiEnvelope<RoleSummary[]>>(`/users/${id}/roles`)
    ).data;
  },
  async replaceRoles(id: string, roleIds: string[]) {
    return (
      await apiFetch<ApiEnvelope<RoleSummary[]>>(`/users/${id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds }),
      })
    ).data;
  },
};
