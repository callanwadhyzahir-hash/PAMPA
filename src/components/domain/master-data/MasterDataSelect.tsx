'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { MasterDataOption } from '@/services/master-data/master-data.types';

type MasterDataSelectProps = {
  id: string;
  name: string;
  value: string;
  options: MasterDataOption[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function MasterDataSelect({
  id,
  name,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: MasterDataSelectProps) {
  const [query, setQuery] = useState('');
  const selectedOption = options.find((option) => option.id === value);
  const visibleOptions = useMemo(
    () => options.filter((option) => `${option.label} ${option.code ?? ''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))),
    [options, query],
  );

  return (
    <DropdownMenu>
      <input type="hidden" id={id} name={name} value={value} required />
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={disabled}
            aria-label={placeholder}
          />
        }
      >
        <span className={selectedOption ? 'truncate' : 'truncate text-muted-foreground'}>
          {selectedOption ? `${selectedOption.code ? `${selectedOption.code} — ` : ''}${selectedOption.label}` : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[min(var(--anchor-width),28rem)] p-2" align="start">
        <Input
          aria-label={`Buscar ${placeholder.toLocaleLowerCase('es')}`}
          placeholder="Buscar"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          // Base UI's Menu attaches Floating UI's typeahead handler to the
          // popup: any single-character keydown bubbling up to it calls
          // preventDefault() to jump-select a menu item by its first letter,
          // which silently ate every keystroke meant for this search input.
          // Only stop propagation for those single-character keys — Escape,
          // arrows, Enter and Tab (event.key.length > 1) still bubble so the
          // menu's own dismiss/list-navigation keeps working.
          onKeyDown={(event) => {
            if (event.key.length === 1) event.stopPropagation();
          }}
          className="mb-2"
        />
        <div className="max-h-56 overflow-y-auto">
          {visibleOptions.length ? visibleOptions.map((option) => (
            <DropdownMenuItem key={option.id} onClick={() => onChange(option.id)}>
              <Check className={`size-4 ${option.id === value ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" />
              {option.code ? `${option.code} — ${option.label}` : option.label}
            </DropdownMenuItem>
          )) : (
            <p className="px-2 py-3 text-sm text-muted-foreground">No se encontraron opciones.</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { MasterDataSelect };
