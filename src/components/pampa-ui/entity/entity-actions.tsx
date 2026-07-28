'use client';

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { EntityAction, EntityRecord } from '../types/entity';

type EntityActionsProps<T extends EntityRecord> = {
  item: T;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  actions?: EntityAction<T>[];
};

function EntityActions<T extends EntityRecord>({
  item,
  onEdit,
  onDelete,
  actions = [],
}: EntityActionsProps<T>) {
  if (!onEdit && !onDelete && !actions.length) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon" aria-label="Acciones de fila" />}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit ? (
          <DropdownMenuItem onClick={() => onEdit(item)}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
        ) : null}
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.id}
            variant={action.destructive ? 'destructive' : 'default'}
            onClick={() => action.onSelect(item)}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
        {onDelete ? (
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(item)}>
            <Trash2 className="size-4" />
            Eliminar
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { EntityActions };
export type { EntityActionsProps };
