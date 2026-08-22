'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PackageX, SearchX, Store } from 'lucide-react';

import { LoadingState } from '@/components/pampa-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  storefrontService,
  type StorefrontCategory,
  type StorefrontProduct,
} from '@/services/storefront/storefront.service';

import { useCatalog } from './_lib/catalog-context';
import { ProductCard } from './_lib/product-card';

export default function StorefrontHomePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { catalog, loading: catalogLoading, notFound } = useCatalog();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!catalog) return;
    const timer = window.setTimeout(() => void storefrontService.listCategories(slug).then(setCategories).catch(() => undefined), 0);
    return () => window.clearTimeout(timer);
  }, [catalog, slug]);

  useEffect(() => {
    if (!catalog) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      storefrontService
        .listProducts(slug, { search: search.trim() || undefined, categoryId: categoryId || undefined, page: 1 })
        .then((result) => {
          setProducts(result.items);
          setPage(1);
          setPages(result.pagination.pages);
        })
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [catalog, slug, search, categoryId]);

  async function loadMore() {
    const next = page + 1;
    const result = await storefrontService.listProducts(slug, {
      search: search.trim() || undefined,
      categoryId: categoryId || undefined,
      page: next,
    });
    setProducts((current) => [...current, ...result.items]);
    setPage(next);
  }

  if (catalogLoading) return <LoadingState label="Cargando catálogo" />;

  if (notFound || !catalog) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <Store className="size-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-lg font-semibold">Catálogo no disponible</h1>
        <p className="text-sm text-muted-foreground">
          Este enlace no existe o el negocio todavía no activó su catálogo público.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pt-4">
      <section className="space-y-1.5">
        <h1 className="text-xl font-semibold">{catalog.displayName}</h1>
        {catalog.description ? (
          <p className="text-sm text-muted-foreground">{catalog.description}</p>
        ) : null}
      </section>

      <Input
        type="search"
        placeholder="Buscar productos…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="h-11"
      />

      {categories.length > 0 ? (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => setCategoryId('')}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              categoryId === '' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
            }`}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                categoryId === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <LoadingState label="Buscando productos" />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          {search || categoryId ? (
            <>
              <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                No encontramos productos para tu búsqueda.
              </p>
            </>
          ) : (
            <>
              <PackageX className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Todavía no hay productos publicados.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} slug={slug} product={product} />
            ))}
          </div>
          {page < pages ? (
            <div className="flex justify-center pb-4">
              <Button type="button" variant="outline" onClick={() => void loadMore()}>
                Ver más productos
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
