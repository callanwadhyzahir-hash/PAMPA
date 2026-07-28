'use client';

import type { ReactNode } from 'react';

import { InfoCard } from '../cards/info-card';
import { useCrudContext } from '../contexts/crud-context';
import { ErrorState } from '../feedback/error-state';
import { SuccessFeedback } from '../feedback/success-feedback';
import { useDisclosure } from '../hooks/use-disclosure';
import { PageHeader } from '../layout/page-header';
import { PageTitle } from '../layout/page-title';
import type { CrudState, CrudSuccessAction } from '../types/crud';
import type { DataTableColumn } from '../tables/data-table';
import type { EntityAction, EntityMetadata, EntityRecord } from '../types/entity';
import { EntityActions } from './entity-actions';
import { EntityDeleteDialog } from './entity-delete-dialog';
import { EntityDialog } from './entity-dialog';
import { EntityTable } from './entity-table';
import { EntityToolbar } from './entity-toolbar';

type EntityFormContext<T extends EntityRecord, CreateInput, UpdateInput> = {
  mode: 'create' | 'edit';
  item: T | null;
  crud: CrudState<T, CreateInput, UpdateInput>;
  close: () => void;
};

type EntityModuleProps<T extends EntityRecord, CreateInput = Partial<T>, UpdateInput = Partial<T>> = {
  title: string;
  description?: string;
  columns: DataTableColumn<T>[];
  form?: (context: EntityFormContext<T, CreateInput, UpdateInput>) => ReactNode;
  toolbarActions?: ReactNode;
  rowActions?: EntityAction<T>[];
  emptyState?: ReactNode;
  searchPlaceholder?: string;
  searchable?: boolean;
  getItemLabel?: (item: T) => string;
  entityMetadata: EntityMetadata;
};

function getSuccessMessage(metadata: EntityMetadata, action: CrudSuccessAction): string {
  const actionLabels = metadata.gender === 'female'
    ? { create: 'creada', update: 'actualizada', remove: 'eliminada' }
    : { create: 'creado', update: 'actualizado', remove: 'eliminado' };

  return `${metadata.singular} ${actionLabels[action]} correctamente.`;
}

function EntityModule<T extends EntityRecord, CreateInput = Partial<T>, UpdateInput = Partial<T>>({
  title,
  description,
  columns,
  form,
  toolbarActions,
  rowActions,
  emptyState,
  searchPlaceholder,
  searchable,
  getItemLabel = () => 'este elemento',
  entityMetadata,
}: EntityModuleProps<T, CreateInput, UpdateInput>) {
  const crud = useCrudContext<T, CreateInput, UpdateInput>();
  const formDialog = useDisclosure();
  const deleteDialog = useDisclosure();
  const successMessage = crud.successAction
    ? getSuccessMessage(entityMetadata, crud.successAction)
    : null;

  const setDialogOpen = (setOpen: (open: boolean) => void, open: boolean) => {
    crud.clearError();
    setOpen(open);
  };

  const openCreate = () => {
    crud.clearSelection();
    setDialogOpen(formDialog.setOpen, true);
  };

  const openEdit = (item: T) => {
    crud.select(item);
    setDialogOpen(formDialog.setOpen, true);
  };

  const openDelete = (item: T) => {
    crud.select(item);
    setDialogOpen(deleteDialog.setOpen, true);
  };

  const handleDelete = () => {
    if (!crud.selectedItem) {
      return;
    }

    void crud.remove(crud.selectedItem.id).then((removed) => {
      if (removed) {
        setDialogOpen(deleteDialog.setOpen, false);
      }
    });
  };

  const tableColumns: DataTableColumn<T>[] = [
    ...columns,
    {
      id: 'actions',
      header: <span className="sr-only">Acciones</span>,
      className: 'w-12 text-right',
      cell: (item) => (
        <EntityActions
          item={item}
          onEdit={form ? openEdit : undefined}
          onDelete={openDelete}
          actions={rowActions}
        />
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <SuccessFeedback message={successMessage} onDismiss={crud.clearSuccess} />
      <PageHeader>
        <PageTitle title={title} description={description} />
      </PageHeader>
      <InfoCard title={title}>
        <EntityToolbar<T>
          onCreate={form ? openCreate : undefined}
          actions={toolbarActions}
          searchPlaceholder={searchPlaceholder}
          searchable={searchable}
        />
        {crud.error ? (
          <ErrorState
            description={crud.error.message}
            action={
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => void crud.refresh()}
              >
                Reintentar
              </button>
            }
          />
        ) : (
          <EntityTable
            columns={tableColumns}
            data={crud.items}
            loading={crud.loading}
            emptyState={emptyState}
          />
        )}
      </InfoCard>
      {form ? (
        <EntityDialog
          open={formDialog.isOpen}
          onOpenChange={(open) => setDialogOpen(formDialog.setOpen, open)}
          title={crud.selectedItem ? `Editar ${title}` : `Crear ${title}`}
          errorMessage={crud.error?.message}
        >
          {form({
            mode: crud.selectedItem ? 'edit' : 'create',
            item: crud.selectedItem,
            crud,
            close: () => setDialogOpen(formDialog.setOpen, false),
          })}
        </EntityDialog>
      ) : null}
      <EntityDeleteDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => setDialogOpen(deleteDialog.setOpen, open)}
        title="Eliminar elemento"
        description={
          crud.selectedItem
            ? `Esta accion eliminara ${getItemLabel(crud.selectedItem)}.`
            : 'Esta accion eliminara el elemento seleccionado.'
        }
        onConfirm={handleDelete}
        loading={crud.loading}
        errorMessage={crud.error?.message}
      />
    </section>
  );
}

export { EntityModule };
export type { EntityFormContext, EntityModuleProps };
