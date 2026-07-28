'use client';

import { createContext, useContext } from 'react';

import type { CrudState } from '../types/crud';
import type { EntityRecord } from '../types/entity';

type CrudContextValue = CrudState<EntityRecord, unknown, unknown>;

const CrudContext = createContext<CrudContextValue | null>(null);

function useCrudContext<T extends EntityRecord, CreateInput = Partial<T>, UpdateInput = Partial<T>>() {
  const context = useContext(CrudContext);

  if (!context) {
    throw new Error('useCrudContext debe utilizarse dentro de CrudProvider.');
  }

  return context as unknown as CrudState<T, CreateInput, UpdateInput>;
}

export { CrudContext, useCrudContext };
export type { CrudContextValue };
