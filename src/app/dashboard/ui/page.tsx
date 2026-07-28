'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { companyColumns } from '@/components/domain/company/CompanyColumns';
import { CompanyForm } from '@/components/domain/company/CompanyForm';
import { CompanyTypeSelect } from '@/components/domain/master-data/CompanyTypeSelect';
import { CurrencySelect } from '@/components/domain/master-data/CurrencySelect';
import { TaxConditionSelect } from '@/components/domain/master-data/TaxConditionSelect';
import {
  Breadcrumbs,
  ConfirmDialog,
  CreateButton,
  CrudProvider,
  DataTable,
  DataTableEmpty,
  DataTableLoading,
  DataTablePagination,
  DataTableToolbar,
  DeleteDialog,
  EmptyState,
  EntityActions,
  EntityDialog,
  EntityForm,
  EntityModule,
  ErrorState,
  FilterBar,
  FormActions,
  FormGrid,
  FormSection,
  InfoCard,
  KeyValueList,
  LoadingState,
  PageActions,
  PageContainer,
  PageHeader,
  PageSection,
  PageTitle,
  PageToolbar,
  RefreshButton,
  SearchInput,
  StatusBadge,
  useDisclosure,
  type DataTableColumn,
} from '@/components/pampa-ui';
import type { Company, CompanyCreateInput, CompanyUpdateInput } from '@/services/company/companies.types';

type ShowcaseRow = {
  id: string;
  label: string;
  state: 'Disponible' | 'Pendiente';
};

const rows: ShowcaseRow[] = [
  { id: '1', label: 'Elemento de ejemplo A', state: 'Disponible' },
  { id: '2', label: 'Elemento de ejemplo B', state: 'Pendiente' },
];

const columns: DataTableColumn<ShowcaseRow>[] = [
  { id: 'label', header: 'Etiqueta', cell: (row) => row.label },
  {
    id: 'state',
    header: 'Estado',
    cell: (row) => (
      <StatusBadge
        label={row.state}
        variant={row.state === 'Disponible' ? 'success' : 'warning'}
      />
    ),
  },
];

const frameworkColumns: DataTableColumn<ShowcaseRow>[] = [
  { id: 'label', header: 'Etiqueta', cell: (row) => row.label },
];

export default function UiShowcasePage() {
  const entityDialog = useDisclosure();
  const confirmDialog = useDisclosure();
  const deleteDialog = useDisclosure();
  const [page, setPage] = useState(1);
  const [companyTypeId, setCompanyTypeId] = useState('');
  const [taxConditionId, setTaxConditionId] = useState('');
  const [currencyId, setCurrencyId] = useState('');

  return (
    <PageContainer className="space-y-10">
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'PAMPA UI' }]} />

      <PageHeader>
        <PageTitle
          title="PAMPA UI"
          description="Biblioteca interna de componentes para el ERP."
        />
        <PageActions>
          <RefreshButton onClick={() => undefined} />
          <CreateButton label="Abrir formulario" onClick={entityDialog.open} />
        </PageActions>
      </PageHeader>

      <PageSection title="Navegacion y acciones" description="Encabezados, toolbars y controles reutilizables.">
        <PageToolbar>
          <SearchInput aria-label="Buscar componentes" />
          <FilterBar>
            <Button type="button" variant="outline">Filtro</Button>
            <Button type="button" variant="ghost">Limpiar</Button>
          </FilterBar>
        </PageToolbar>
      </PageSection>

      <PageSection title="Tablas" description="Composición de tabla, toolbar, estados y paginación.">
        <InfoCard title="Tabla de referencia" description="Sin datos de negocio.">
          <DataTableToolbar>
            <SearchInput aria-label="Buscar en tabla" />
            <StatusBadge label="2 elementos" variant="info" />
          </DataTableToolbar>
          <DataTable columns={columns} data={rows} getRowId={(row) => row.id} caption="Tabla de ejemplo" />
          <DataTablePagination
            page={page}
            pageCount={2}
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(2, current + 1))}
          />
        </InfoCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard title="Carga de tabla"><DataTableLoading columnCount={3} /></InfoCard>
          <InfoCard title="Tabla sin resultados"><DataTableEmpty /></InfoCard>
        </div>
      </PageSection>

      <PageSection title="Estados y badges">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard title="Carga"><LoadingState label="Preparando interfaz" /></InfoCard>
          <InfoCard title="Sin contenido"><EmptyState title="Sin elementos" description="Este es un estado reusable." /></InfoCard>
          <InfoCard title="Error"><ErrorState /></InfoCard>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Predeterminado" />
          <StatusBadge label="Correcto" variant="success" />
          <StatusBadge label="Atencion" variant="warning" />
          <StatusBadge label="Error" variant="danger" />
          <StatusBadge label="Informacion" variant="info" />
        </div>
      </PageSection>

      <PageSection title="Datos y confirmaciones">
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard title="Datos de muestra">
            <KeyValueList items={[{ label: 'Componente', value: 'PAMPA UI' }, { label: 'Tema', value: 'Claro' }]} />
          </InfoCard>
          <InfoCard title="Dialogos">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={confirmDialog.open}>Abrir confirmacion</Button>
              <Button type="button" variant="destructive" onClick={deleteDialog.open}>Abrir eliminacion</Button>
            </div>
          </InfoCard>
        </div>
      </PageSection>

      <PageSection
        title="Entity Framework"
        description="Composicion generica sin entidad, formulario ni API de negocio."
      >
        <CrudProvider<ShowcaseRow>
          config={{ endpoint: '/ui-preview', autoLoad: false }}
        >
          <EntityModule
            title="Entidad de referencia"
            entityMetadata={{
              singular: 'Entidad',
              plural: 'Entidades',
              gender: 'female',
            }}
            description="El provider administra estado; el modulo compone la interfaz."
            columns={frameworkColumns}
            emptyState={
              <EmptyState
                title="Sin elementos para mostrar"
                description="El showcase no consume APIs."
              />
            }
            form={() => (
              <p className="text-sm text-muted-foreground">
                Formulario inyectado por el modulo consumidor.
              </p>
            )}
          />
        </CrudProvider>
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <span className="text-sm text-muted-foreground">
            Acciones extensibles:
          </span>
          <EntityActions
            item={{ id: 'preview' }}
            onEdit={() => undefined}
            onDelete={() => undefined}
            actions={[{ id: 'view', label: 'Ver', onSelect: () => undefined }]}
          />
        </div>
      </PageSection>

      <PageSection
        title="Companies Module Demo"
        description="Configuracion visual del modulo Companies mediante EntityModule, sus columnas y su formulario reutilizable."
      >
        <CrudProvider<Company, CompanyCreateInput, CompanyUpdateInput>
          config={{ endpoint: '/companies', autoLoad: false }}
        >
          <EntityModule
            title="Empresas"
            entityMetadata={{
              singular: 'Empresa',
              plural: 'Empresas',
              gender: 'female',
            }}
            description="Demostracion visual sin comunicacion con la API."
            columns={companyColumns}
            form={(context) => <CompanyForm key={context.item?.id ?? 'create'} {...context} />}
            emptyState={<EmptyState title="No hay empresas para mostrar" />}
            getItemLabel={(company) => `la empresa ${company.name}`}
          />
        </CrudProvider>
      </PageSection>

      <PageSection
        title="Master Data Components"
        description="Selectores con datos reales de los catálogos del sistema."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <InfoCard title="Tipo de empresa">
            <CompanyTypeSelect value={companyTypeId} onChange={setCompanyTypeId} />
          </InfoCard>
          <InfoCard title="Condición fiscal">
            <TaxConditionSelect value={taxConditionId} onChange={setTaxConditionId} />
          </InfoCard>
          <InfoCard title="Moneda">
            <CurrencySelect value={currencyId} onChange={setCurrencyId} />
          </InfoCard>
        </div>
      </PageSection>

      <EntityDialog
        open={entityDialog.isOpen}
        onOpenChange={entityDialog.setOpen}
        title="Formulario de referencia"
        description="Composición reutilizable sin lógica de negocio."
        footer={<FormActions><Button type="button" variant="outline" onClick={entityDialog.close}>Cancelar</Button><Button type="submit" form="showcase-form">Guardar</Button></FormActions>}
      >
        <EntityForm id="showcase-form" onSubmit={(event) => { event.preventDefault(); entityDialog.close(); }}>
          <FormSection title="Campos de ejemplo" description="La grilla se adapta a una columna en pantallas pequeñas.">
            <FormGrid>
              <label className="space-y-1.5 text-sm font-medium">Etiqueta<Input placeholder="Escribir aqui" /></label>
              <label className="space-y-1.5 text-sm font-medium">Referencia<Input placeholder="Opcional" /></label>
            </FormGrid>
          </FormSection>
        </EntityForm>
      </EntityDialog>

      <ConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={confirmDialog.setOpen}
        title="Confirmar accion"
        description="Este diálogo se reutiliza para confirmaciones no destructivas."
        onConfirm={confirmDialog.close}
      />
      <DeleteDialog
        open={deleteDialog.isOpen}
        onOpenChange={deleteDialog.setOpen}
        itemLabel="este elemento de ejemplo"
        onConfirm={deleteDialog.close}
      />
    </PageContainer>
  );
}
