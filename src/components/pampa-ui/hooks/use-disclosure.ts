'use client';

import { useCallback, useState } from 'react';

type UseDisclosureResult = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
};

function useDisclosure(initialOpen = false): UseDisclosureResult {
  const [isOpen, setOpen] = useState(initialOpen);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  return { isOpen, open, close, setOpen };
}

export { useDisclosure };
export type { UseDisclosureResult };
