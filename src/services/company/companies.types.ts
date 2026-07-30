type Company = {
  id: string;
  company_type_id: string;
  tax_condition_id: string;
  currency_id: string;
  name: string;
  legal_name: string | null;
  tax_id: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CompanyCreateInput = {
  companyTypeId: string;
  taxConditionId: string;
  currencyId: string;
  name: string;
  legalName?: string;
  taxId: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  isActive?: boolean;
};

type CompanyUpdateInput = Partial<CompanyCreateInput>;

type ApiResponse<T> = {
  success: boolean;
  message: string;
  timestamp: string;
  data: T;
};

export type {
  ApiResponse,
  Company,
  CompanyCreateInput,
  CompanyUpdateInput,
};
