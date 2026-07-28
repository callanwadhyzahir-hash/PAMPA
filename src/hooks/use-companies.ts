'use client';

import { useCrud } from '@/components/pampa-ui';
import { companiesService } from '@/services/company/companies.service';
import type { Company, CompanyCreateInput, CompanyUpdateInput } from '@/services/company/companies.types';

function useCompanies() {
  return useCrud<Company, CompanyCreateInput, CompanyUpdateInput>({
    endpoint: '/companies',
    service: companiesService,
  });
}

export { useCompanies };
