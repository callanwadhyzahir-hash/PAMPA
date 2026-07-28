'use client';

import { useCallback, useEffect, useState } from 'react';

import type {
  CrudConfig,
  CrudState,
  CrudSuccessAction,
  PaginationState,
  SortingState,
} from '../types/crud';
import type { EntityRecord } from '../types/entity';

const defaultPagination: PaginationState = {
  page: 1,
  pageSize: 20,
  total: 0,
};

const defaultSorting: SortingState = {
  field: null,
  direction: null,
};

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error('No se pudo completar la operacion.');
}

function useCrud<T extends EntityRecord, CreateInput = Partial<T>, UpdateInput = Partial<T>>(
  config: CrudConfig<T, CreateInput, UpdateInput>,
): CrudState<T, CreateInput, UpdateInput> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [successAction, setSuccessAction] = useState<CrudSuccessAction | null>(null);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string | number | boolean | null>>({});
  const [pagination, setPagination] = useState<PaginationState>({
    ...defaultPagination,
    ...config.initialPagination,
  });
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const service = config.service;

  const refresh = useCallback(async () => {
    if (!service) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await service.list();
      setItems(response.data);
      setPagination((current) => ({ ...current, total: response.data.length }));
    } catch (cause: unknown) {
      setError(toError(cause));
    } finally {
      setLoading(false);
    }
  }, [service]);

  const create = useCallback(
    async (input: CreateInput) => {
      if (!service) {
        setError(new Error(`No hay un servicio CRUD configurado para ${config.endpoint}.`));
        return null;
      }

      setLoading(true);
      setError(null);
      setSuccessAction(null);

      try {
        const response = await service.create(input);
        setItems((current) => [...current, response.data]);
        setPagination((current) => ({ ...current, total: current.total + 1 }));
        setSuccessAction('create');
        return response.data;
      } catch (cause: unknown) {
        setError(toError(cause));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [config.endpoint, service],
  );

  const update = useCallback(
    async (id: string, input: UpdateInput) => {
      if (!service) {
        setError(new Error(`No hay un servicio CRUD configurado para ${config.endpoint}.`));
        return null;
      }

      setLoading(true);
      setError(null);
      setSuccessAction(null);

      try {
        const response = await service.update(id, input);
        setItems((current) => current.map((item) => (item.id === id ? response.data : item)));
        setSelectedItem((current) => (current?.id === id ? response.data : current));
        setSuccessAction('update');
        return response.data;
      } catch (cause: unknown) {
        setError(toError(cause));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [config.endpoint, service],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!service) {
        setError(new Error(`No hay un servicio CRUD configurado para ${config.endpoint}.`));
        return null;
      }

      setLoading(true);
      setError(null);
      setSuccessAction(null);

      try {
        const response = await service.remove(id);
        setItems((current) => current.filter((item) => item.id !== id));
        setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
        setSelectedItem((current) => (current?.id === id ? null : current));
        setSuccessAction('remove');
        return response.data;
      } catch (cause: unknown) {
        setError(toError(cause));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [config.endpoint, service],
  );

  useEffect(() => {
    if (!(config.autoLoad ?? Boolean(service))) {
      return;
    }

    const refreshTimeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(refreshTimeout);
  }, [config.autoLoad, refresh, service]);

  const clearError = useCallback(() => setError(null), []);

  const clearSuccess = useCallback(() => setSuccessAction(null), []);

  const clearSelection = useCallback(() => setSelectedItem(null), []);

  return {
    items,
    loading,
    error,
    successAction,
    selectedItem,
    search,
    filters,
    pagination,
    sorting,
    refresh,
    create,
    update,
    remove,
    select: setSelectedItem,
    clearError,
    clearSuccess,
    clearSelection,
    setSearch,
    setFilters,
    setPagination,
    setSorting,
  };
}

export { useCrud };
