import { Search } from 'lucide-react';
import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';

type SearchInputProps = Omit<ComponentProps<typeof Input>, 'type'>;

function SearchInput({ placeholder = 'Buscar', ...props }: SearchInputProps) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input type="search" className="pl-9" placeholder={placeholder} {...props} />
    </div>
  );
}

export { SearchInput };
export type { SearchInputProps };
