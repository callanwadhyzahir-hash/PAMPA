'use client';

import { companyColumns } from '@/components/domain/company/CompanyColumns';
import { CompanyForm } from '@/components/domain/company/CompanyForm';
import { CrudContext, EntityModule, EmptyState, PageContainer, PageSection } from '@/components/pampa-ui';
import type { CrudContextValue } from '@/components/pampa-ui';
import { useCompanies } from '@/hooks/use-companies';

function CompaniesContent() {
  const crud = useCompanies();

  return (
    <CrudContext.Provider value={crud as unknown as CrudContextValue}>
      <EntityModule
        title="Empresas"
        entityMetadata={{
          singular: 'Empresa',
          plural: 'Empresas',
          gender: 'female',
        }}
        description="Administracion de las empresas registradas en PAMPA."
        columns={companyColumns}
        form={(context) => <CompanyForm key={context.item?.id ?? 'create'} {...context} />}
        emptyState={
          <EmptyState
            title="No hay empresas registradas"
            description="Crea la primera empresa para comenzar a organizar la operacion."
          />
        }
        getItemLabel={(company) => `la empresa ${company.name}`}
      />
    </CrudContext.Provider>
  );
}

export default function CompaniesPage() {
  return (
    <PageContainer>
      <PageSection>
        <CompaniesContent />
      </PageSection>
    </PageContainer>
  );
}
