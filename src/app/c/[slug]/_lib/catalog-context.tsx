'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { storefrontService, type StorefrontCatalog } from '@/services/storefront/storefront.service';

interface CatalogContextValue {
  catalog: StorefrontCatalog | null;
  loading: boolean;
  notFound: boolean;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function CatalogProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [catalog, setCatalog] = useState<StorefrontCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setNotFound(false);
      storefrontService
        .getCatalog(slug)
        .then((result) => {
          if (active) setCatalog(result);
        })
        .catch(() => {
          if (active) setNotFound(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [slug]);

  return (
    <CatalogContext.Provider value={{ catalog, loading, notFound }}>
      {children}
    </CatalogContext.Provider>
  );
}

function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog must be used within a CatalogProvider');
  return context;
}

export { CatalogProvider, useCatalog };
