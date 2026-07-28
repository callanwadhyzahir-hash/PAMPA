'use client';

import type { ReactNode } from 'react';

import { CreateButton } from '../actions/create-button';
import { SearchInput } from '../search/search-input';
import { RefreshButton } from '../actions/refresh-button';
import { useCrudContext } from '../contexts/crud-context';
import type { EntityRecord } from '../types/entity';

type EntityToolbarProps = {
  onCreate?: () => void;
  actions?: ReactNode;
  searchPlaceholder?: string;
  searchable?: boolean;
};

function EntityToolbar<T extends EntityRecord>({
  onCreate,
  actions,
  searchPlaceholder = 'Buscar',
  searchable = false,
}: EntityToolbarProps) {
  const crud = useCrudContext<T>();

  return (
    <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
      {searchable ? (
        <SearchInput
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={crud.search}
          onChange={(event) => crud.setSearch(event.target.value)}
        />
      ) : <span />}
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <RefreshButton onClick={() => void crud.refresh()} loading={crud.loading} />
        {onCreate ? <CreateButton onClick={onCreate} /> : null}
      </div>
    </div>
  );
}

export { EntityToolbar };
export type { EntityToolbarProps };
