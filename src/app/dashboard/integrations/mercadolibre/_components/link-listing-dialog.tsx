'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/pampa-ui/feedback/empty-state';
import { ProductImage } from '@/components/pampa-ui/products/product-image';
import { ProductPickerRow } from '@/components/pampa-ui/products/product-picker-row';
import { SearchInput } from '@/components/pampa-ui/search/search-input';
import { productsService, type Product } from '@/services/catalog/products.service';
import type { MercadoLibreListing } from '@/services/integrations/mercadolibre.service';

type LinkListingDialogProps = {
  listing: MercadoLibreListing | null;
  onOpenChange: (open: boolean) => void;
  onLink: (productId: string) => Promise<void>;
};

function LinkListingDialog({ listing, onOpenChange, onLink }: LinkListingDialogProps) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!listing) return;
    const timer = window.setTimeout(() => {
      setSearch('');
      setProducts([]);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [listing]);

  useEffect(() => {
    if (!listing) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      productsService
        .list({ search: search || undefined, isActive: true, limit: 20 })
        .then((page) => {
          if (active) setProducts(page.items);
        })
        .finally(() => active && setLoading(false));
    }, 300);
    return () => {
      window.clearTimeout(timer);
      active = false;
    };
  }, [listing, search]);

  if (!listing) return null;

  const handleLink = async (productId: string) => {
    setLinkingId(productId);
    try {
      await onLink(productId);
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <Dialog open={Boolean(listing)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular producto de PAMPA</DialogTitle>
          <DialogDescription>
            Esto solo asocia la publicación con un producto de PAMPA. No
            sincroniza precio ni stock automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <ProductImage
            src={listing.thumbnail_url}
            alt={listing.title}
            size="md"
            unoptimized
          />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Publicación Mercado Libre</p>
            <p className="truncate font-medium">{listing.title}</p>
          </div>
        </div>

        <SearchInput
          placeholder="Buscar por nombre o código"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Buscando…</p>
          ) : products.length === 0 ? (
            <EmptyState title="Sin resultados" description="Probá con otro nombre o código." />
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="flex w-full items-center justify-between gap-2 rounded-sm border border-transparent px-3 py-2 text-sm hover:border-border hover:bg-accent"
              >
                <ProductPickerRow
                  imageUrl={product.image_url}
                  name={product.name}
                  code={product.code}
                  barcode={product.barcode}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleLink(product.id)}
                  disabled={linkingId !== null}
                >
                  {linkingId === product.id ? 'Vinculando…' : 'Vincular'}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { LinkListingDialog };
