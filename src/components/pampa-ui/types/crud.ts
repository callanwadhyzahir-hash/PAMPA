import type { EntityRecord } from './entity';

export type PaginationState = {
  page: number;
  pageSize: number;
  total: number;
};

export type SortingState = {
  field: string | null;
  direction: 'asc' | 'desc' | null;
};

export type CrudResponse<T> = {
  data: T;
  message?: string;
  success?: boolean;
};

export type CrudSuccessAction = 'create' | 'update' | 'remove';

export type CrudService<T extends EntityRecord, CreateInput, UpdateInput> = {
  list: () => Promise<CrudResponse<T[]>>;
  create: (input: CreateInput) => Promise<CrudResponse<T>>;
  update: (id: string, input: UpdateInput) => Promise<CrudResponse<T>>;
  remove: (id: string) => Promise<CrudResponse<T>>;
};

export type CrudConfig<T extends EntityRecord, CreateInput, UpdateInput> = {
  endpoint: string;
  service?: CrudService<T, CreateInput, UpdateInput>;
  autoLoad?: boolean;
  initialPagination?: Partial<PaginationState>;
};

export type CrudState<T extends EntityRecord, CreateInput, UpdateInput> = {
  items: T[];
  loading: boolean;
  error: Error | null;
  successAction: CrudSuccessAction | null;
  selectedItem: T | null;
  search: string;
  filters: Record<string, string | number | boolean | null>;
  pagination: PaginationState;
  sorting: SortingState;
  refresh: () => Promise<void>;
  create: (input: CreateInput) => Promise<T | null>;
  update: (id: string, input: UpdateInput) => Promise<T | null>;
  remove: (id: string) => Promise<T | null>;
  select: (item: T | null) => void;
  clearError: () => void;
  clearSuccess: () => void;
  clearSelection: () => void;
  setSearch: (search: string) => void;
  setFilters: (filters: Record<string, string | number | boolean | null>) => void;
  setPagination: (pagination: PaginationState) => void;
  setSorting: (sorting: SortingState) => void;
};
