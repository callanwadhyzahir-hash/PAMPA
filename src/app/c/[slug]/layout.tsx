'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShoppingCart, Store } from 'lucide-react';

import { CartProvider, useCart } from './_lib/cart-context';
import { CatalogProvider, useCatalog } from './_lib/catalog-context';

function StorefrontHeader({ slug }: { slug: string }) {
  const { catalog } = useCatalog();
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
        <Link href={`/c/${slug}`} className="flex min-w-0 items-center gap-2">
          {catalog?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external merchant logo, arbitrary host
            <img
              src={catalog.logoUrl}
              alt={catalog.displayName}
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Store className="size-4" aria-hidden="true" />
            </span>
          )}
          <span className="truncate font-semibold">{catalog?.displayName ?? 'Catálogo'}</span>
        </Link>
        <Link
          href={`/c/${slug}/carrito`}
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-secondary"
          aria-label={`Carrito, ${count} artículo${count === 1 ? '' : 's'}`}
        >
          <ShoppingCart className="size-5" aria-hidden="true" />
          {count > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {count > 9 ? '9+' : count}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  return (
    <CatalogProvider slug={slug}>
      <CartProvider slug={slug}>
        <div className="mx-auto flex min-h-full max-w-2xl flex-col bg-background">
          <StorefrontHeader slug={slug} />
          <main className="flex-1 pb-10">{children}</main>
          <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
            Catálogo gestionado con PAMPA
          </footer>
        </div>
      </CartProvider>
    </CatalogProvider>
  );
}
