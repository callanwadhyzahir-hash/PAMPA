import type { ReactNode } from 'react';

import { DataTable } from '../tables/data-table';
import { DataTableEmpty } from '../tables/data-table-empty';
import { DataTableLoading } from '../tables/data-table-loading';
import type { DataTableColumn } from '../tables/data-table';
import type { EntityRecord } from '../types/entity';

type EntityTableProps<T extends EntityRecord> = {
  columns: DataTableColumn<T>[];
  data: T[];
  loading: boolean;
  emptyState?: ReactNode;
  getRowId?: (item: T) => string;
};

function EntityTable<T extends EntityRecord>({
  columns,
  data,
  loading,
  emptyState,
  getRowId = (item) => item.id,
}: EntityTableProps<T>) {
  if (loading) {
    return <DataTableLoading columnCount={Math.max(columns.length, 1)} />;
  }

  if (!data.length) {
    return <>{emptyState ?? <DataTableEmpty />}</>;
  }

  return <DataTable columns={columns} data={data} getRowId={getRowId} />;
}

export { EntityTable };
export type { EntityTableProps };
