'use client';

import type { ReactNode } from 'react';

import { CrudContext, type CrudContextValue } from '../contexts/crud-context';
import { useCrud } from '../hooks/use-crud';
import type { CrudConfig } from '../types/crud';
import type { EntityRecord } from '../types/entity';

type CrudProviderProps<T extends EntityRecord, CreateInput, UpdateInput> = {
  config: CrudConfig<T, CreateInput, UpdateInput>;
  children: ReactNode;
};

function CrudProvider<T extends EntityRecord, CreateInput = Partial<T>, UpdateInput = Partial<T>>({
  config,
  children,
}: CrudProviderProps<T, CreateInput, UpdateInput>) {
  const crud = useCrud(config);

  return (
    <CrudContext.Provider value={crud as unknown as CrudContextValue}>
      {children}
    </CrudContext.Provider>
  );
}

export { CrudProvider };
export type { CrudProviderProps };
