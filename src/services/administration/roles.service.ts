import { apiFetch } from '@/services/api';

import type {
  ApiEnvelope,
  PermissionSummary,
  RoleDetail,
} from './types';

export const rolesService = {
  async list() {
    return (await apiFetch<ApiEnvelope<RoleDetail[]>>('/roles')).data;
  },
  async listPermissions() {
    return (
      await apiFetch<ApiEnvelope<PermissionSummary[]>>('/permissions')
    ).data;
  },
  async create(input: { name: string; description?: string }) {
    return (
      await apiFetch<ApiEnvelope<RoleDetail>>('/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async update(
    id: string,
    input: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
    },
  ) {
    return (
      await apiFetch<ApiEnvelope<RoleDetail>>(`/roles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  remove(id: string) {
    return apiFetch<void>(`/roles/${id}`, { method: 'DELETE' });
  },
  async replacePermissions(id: string, permissionIds: string[]) {
    return (
      await apiFetch<ApiEnvelope<RoleDetail>>(`/roles/${id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds }),
      })
    ).data;
  },
};
