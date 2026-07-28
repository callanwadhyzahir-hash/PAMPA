import { StatusBadge, type DataTableColumn } from '@/components/pampa-ui';
import type { Company } from '@/services/company/companies.types';

const companyColumns: DataTableColumn<Company>[] = [
  { id: 'name', header: 'Nombre', cell: (company) => company.name },
  { id: 'legal_name', header: 'Razon social', cell: (company) => company.legal_name ?? '—' },
  { id: 'tax_id', header: 'CUIT', cell: (company) => company.tax_id },
  { id: 'email', header: 'Email', cell: (company) => company.email ?? '—' },
  {
    id: 'is_active',
    header: 'Estado',
    cell: (company) => (
      <StatusBadge
        label={company.is_active ? 'Activa' : 'Inactiva'}
        variant={company.is_active ? 'success' : 'warning'}
      />
    ),
  },
];

export { companyColumns };
