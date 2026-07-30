import { apiFetch } from '@/services/api';

interface ApiEnvelope<T> {
  data: T;
}

export interface Client {
  id: string;
  code: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  is_company: boolean;
  credit_limit: string;
  current_balance: string;
  notes: string | null;
  is_active: boolean;
  _count: { sale: number };
}

export interface ClientInput {
  code: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isCompany: boolean;
  creditLimit?: number;
  notes?: string;
  isActive?: boolean;
}

export interface ClientSale {
  id: string;
  sale_number: string;
  sale_date: string;
  total: string;
  status: string;
  branch: { id: string; name: string; code: string };
  payment: Array<{ id: string; total: string; payment_date: string }>;
}

export interface ClientAccount {
  clientId: string;
  salesTotal: string;
  paidTotal: string;
  balance: string;
  creditLimit: string;
}

export const clientsService = {
  async list(search?: string) {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return (await apiFetch<ApiEnvelope<Client[]>>(`/clients${query}`)).data;
  },
  async get(id: string) {
    return (await apiFetch<ApiEnvelope<Client>>(`/clients/${id}`)).data;
  },
  async create(input: ClientInput) {
    return (
      await apiFetch<ApiEnvelope<Client>>('/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  async update(id: string, input: Partial<ClientInput>) {
    return (
      await apiFetch<ApiEnvelope<Client>>(`/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    ).data;
  },
  deactivate(id: string) {
    return apiFetch<ApiEnvelope<Client>>(`/clients/${id}`, {
      method: 'DELETE',
    });
  },
  async sales(id: string) {
    return (
      await apiFetch<ApiEnvelope<ClientSale[]>>(`/clients/${id}/sales`)
    ).data;
  },
  async account(id: string) {
    return (
      await apiFetch<ApiEnvelope<ClientAccount>>(`/clients/${id}/account`)
    ).data;
  },
};
