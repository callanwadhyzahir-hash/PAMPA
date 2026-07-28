'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { MasterDataOption } from '@/services/master-data/master-data.types';

type MasterDataLoader = () => Promise<MasterDataOption[]>;

function toError(cause: unknown) {
  return cause instanceof Error ? cause : new Error('No se pudo cargar el catalogo.');
}

function useMasterData(load: MasterDataLoader) {
  const [options, setOptions] = useState<MasterDataOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => () => {
    isMounted.current = false;
  }, []);

  const reload = useCallback(async () => {
    if (!isMounted.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextOptions = await load();

      if (isMounted.current) {
        setOptions(nextOptions);
      }
    } catch (cause: unknown) {
      if (isMounted.current) {
        setError(toError(cause));
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [load]);

  useEffect(() => {
    isMounted.current = true;

    const timeoutId = window.setTimeout(() => {
      void reload();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  return { options, loading, error, reload };
}

export { useMasterData };
